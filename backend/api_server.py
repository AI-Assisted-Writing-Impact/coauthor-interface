"""
Starts a Flask server that handles API requests from the frontend.
"""

import os
import gc
import shutil
import random
import openai
import warnings
import numpy as np
from time import time
from argparse import ArgumentParser

from reader import (
    read_api_keys, read_log,
    read_examples, read_prompts, read_blocklist,
    read_access_codes, update_metadata,
)
from helper import (
    print_verbose, print_current_sessions,
    get_uuid, retrieve_log_paths,
    append_session_to_file, get_context_window_size,
    save_log_to_jsonl, save_story_to_json, save_info_to_json, compute_stats, get_last_text_from_log, get_config_for_log,
)
from parsing import (
    parse_prompt, parse_suggestion, parse_probability,
    filter_suggestions
)

from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin

import nltk
nltk.download('punkt')

warnings.filterwarnings("ignore", category=FutureWarning)  # noqa

SESSIONS = dict()
app = Flask(__name__)
CORS(app)  # For Access-Control-Allow-Origin

SUCCESS = True
FAILURE = False


@app.route('/api/start_session', methods=['POST'])
@cross_origin(origin='*')
def start_session():
    content = request.json
    result = {}

    # Read latest prompts, examples, and access codes
    global examples, prompts
    examples = read_examples(config_dir)
    prompts = read_prompts(config_dir)

    allowed_access_codes = read_access_codes(config_dir)
    print("Allowed access codes:", allowed_access_codes)


    # Check access codes
    access_code = content['accessCode']
    print("Received access code:", access_code)

    if access_code not in allowed_access_codes:
        if not access_code:
            access_code = '(not provided)'
        result['status'] = FAILURE
        result['message'] = f'Invalid access code: {access_code}. Please check your access code in URL.'
        print_current_sessions(SESSIONS, 'Invalid access code')
        return jsonify(result)

    config = allowed_access_codes[access_code]

    # Setup a new session
    session_id = get_uuid()  # Generate unique session ID
    verification_code = session_id

    # Ensure model engine from access_codes config
    model_name = getattr(config, 'engine', 'gpt-3.5-turbo').strip()

    # Information returned to user
    # result = {
    #     'access_code': acçcess_code,
    #     'session_id': session_id,
    #
    #     'example_text': examples[config.example],
    #     'prompt_text': prompts[config.prompt],
    # }
    result = {
        'access_code': access_code,
        'session_id': session_id,
        'example_text': examples[config.example],
        'prompt_text': prompts[config.prompt],
        'engine': model_name
    }
    result.update(config.convert_to_dict())

    # Information stored on the server
    SESSIONS[session_id] = {
        'access_code': access_code,
        'session_id': session_id,

        'start_timestamp': time(),
        'last_query_timestamp': time(),
        'verification_code': verification_code,
    }
    SESSIONS[session_id].update(config.convert_to_dict())

    result['status'] = SUCCESS

    session = SESSIONS[session_id]
    # model_name = result['engine'].strip()
    model_name = getattr(config, 'engine', 'gpt-3.5-turbo').strip()

    domain = result['domain'] if 'domain' in result else ''

    append_session_to_file(session, metadata_path)
    print_verbose('New session created', session, verbose)
    print_current_sessions(SESSIONS, f'Session {session_id} ({domain}: {model_name}) has been started successfully.')

    gc.collect(generation=2)
    return jsonify(result)


@app.route('/api/end_session', methods=['POST'])
@cross_origin(origin='*')
def end_session():
    content = request.json
    session_id = content['sessionId']
    log = content['logs']
    story_text = content['storyText']

    path = os.path.join(proj_dir, session_id) + '.jsonl'
    story_path = os.path.join(proj_dir, session_id + '_story.json')

    results = {}
    results['path'] = path
    try:
        save_log_to_jsonl(path, log)

        # store storyText as JSON
        save_story_to_json(story_path, story_text)

        results['status'] = SUCCESS
        results['story_path'] = story_path
    except Exception as e:
        results['status'] = FAILURE
        results['message'] = str(e)
        print(e)
    print_verbose('Save log to file', {
        'session_id': session_id,
        'len(log)': len(log),
        'status': results['status'],
    }, verbose)

    # Remove a finished session
    try:
        # NOTE: Somehow end_session is called twice;
        # Do not pop session_id from SESSIONS to prevent exception
        session = SESSIONS[session_id]
        results['verification_code'] = session['verification_code']
        print_current_sessions(SESSIONS, f'Session {session_id} has been saved successfully.')
    except Exception as e:
        print(e)
        print('# Error at the end of end_session; ignore')
        results['verification_code'] = 'SERVER_ERROR'
        print_current_sessions(SESSIONS, f'Session {session_id} has not been saved.')

    gc.collect(generation=2)
    return jsonify(results)


@app.route('/api/query', methods=['POST'])
@cross_origin(origin='*')
def query():
    content = request.json
    session_id = content['session_id']
    domain = content['domain']
    prev_suggestions = content['suggestions']
    query_type = content.get('type', 'default')  # default or grammar

    results = {}
    try:
        SESSIONS[session_id]['last_query_timestamp'] = time()
    except Exception as e:
        print(f'# Ignoring an error in query: {e}')

    # Check if session ID is valid
    if session_id not in SESSIONS:
        results['status'] = FAILURE
        results['message'] = f'Your session has not been established due to invalid access code. Please check your access code in URL.'
        return jsonify(results)

    # Get example text
    example = content.get('example', '')
    example_text = examples.get(example, '')

    # Extract Instructions and Prompt from request
    instructions = content.get('instructions', 'No instructions provided.')
    prompt_text = content.get('prompt', 'No prompt provided.')

    # Overwrite example text if provided
    if 'example_text' in content:
        example_text = content['example_text']

    # Get configurations
    n = int(content['n'])
    max_tokens = int(content['max_tokens'])
    temperature = float(content['temperature'])
    top_p = float(content['top_p'])
    presence_penalty = float(content['presence_penalty'])
    frequency_penalty = float(content['frequency_penalty'])

    engine = content['engine'] if 'engine' in content else None
    context_window_size = get_context_window_size(engine)

    stop = [sequence for sequence in content['stop'] if len(sequence) > 0]
    if 'DO_NOT_STOP' in stop:
        stop = []

    # Remove special characters
    stop_sequence = [sequence for sequence in stop if sequence not in {'.'}]
    stop_rules = [sequence for sequence in stop if sequence in {'.'}]
    if not stop_sequence:
        stop_sequence = None

    # Parse doc
    doc = content['doc']

    if query_type == 'grammar':
        messages = [
            {
                "role": "system",
                "content": "You are an AI writing assistant. Review the following text for grammar and style improvements. Suggest changes that enhance clarity, coherence, and correctness while preserving the original meaning and tone. Do not provide explanations. "
                           "Only return the modified version of the text if changes are made."
            },
            {
                "role": "user",
                "content": f"Please provide grammar and style suggestions for the following text:\n\n{doc}"
            }
        ]
        max_tokens = 500  # Adjust max tokens for grammar suggestions
    else:
        results = parse_prompt(doc, max_tokens, context_window_size)
        prompt = results['effective_prompt']
        if query_type == 'c':
            messages = [
                {
                    "role": "system",
                    "content": "You are an AI writing assistant. Continue the following text with approximately 250 words."
                               f"Ensure the continuation is coherent, relevant, and does not stop prematurely. "
                               f"Follow these instructions:\n\n"
                               f"{instructions}\n\n"
                               f"Prompt:\n{prompt_text}\n\n"
                },
                {
                    "role": "user",
                    "content": f"Here is the text to continue:\n\n{prompt}"
                }
            ]
            max_tokens = 350
            stop = ["\n\n"]
        elif query_type == 'd':
                messages = [
                    {
                        "role": "system",
                        "content": "You are an AI writing assistant. Generate approximately 250 words of a 500-word text on the following topic."
                                   f"Ensure the output consists of about 250 words, not 250 characters. "
                                   f"Keep it coherent, relevant, and do not stop prematurely. Follow these instructions:\n\n"
                                   f"{instructions}\n\n"
                                   f"Prompt:\n{prompt_text}\n\n"
                    },
                    {
                        "role": "user",
                        "content": f"Please generate the first 250 words of an essay based on this topic:\n\n{prompt}"
                    }
                ]
                max_tokens = 500

        elif query_type == 'f':
            messages = [
                {
                    "role": "system",
                    "content": "You are an AI writing assistant. Continue the following text by adding 3-5 words in a coherent and natural way, expanding the ideas logically. Do not provide explanations."
                               f"{instructions}\n\n"
                               f"Prompt:\n{prompt_text}\n\n"
                },
                {
                    "role": "user",
                    "content": f"Here is the text to continue:\n\n{prompt}"
                }
            ]
            max_tokens = 5

        else:
            messages = [
                {
                    "role": "system",
                    "content": "You are an AI writing assistant. Continue the following text by adding one sentence in a coherent and natural way, expanding the ideas logically. Do not provide explanations."
                               f"{instructions}\n\n"
                               f"Prompt:\n{prompt_text}\n\n"
                },
                {
                    "role": "user",
                    "content": f"Here is the text to continue:\n\n{prompt}"
                }
            ]
    try:
        response = openai.ChatCompletion.create(
            model=engine,
            messages=messages,
            n=3 if query_type != 'grammar' else 1,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            presence_penalty=presence_penalty,
            frequency_penalty=frequency_penalty,
            stop=["\n"] if query_type != 'grammar' and query_type != 'c' and query_type != 'd' else None  # Ensure one sentence for default query
        )
        print(response, 'response')

        continuations = [
            choice['message']['content'].strip() for choice in response['choices']
        ]

        # Build results in the required format
        results = {
            'status': SUCCESS,
            'original_suggestions': [
                {
                    "original": c,
                    "trimmed": c.strip(),
                    "probability": None,  # logprobs not available for ChatCompletion
                    "source": engine
                }
                for c in continuations
            ],
            'suggestions_with_probabilities': [
                {
                    "index": idx,
                    "original": c,
                    "trimmed": c.strip(),
                    "probability": None,
                    "source": engine
                }
                for idx, c in enumerate(continuations)
            ],
            'ctrl': {
                'n': n,
                'max_tokens': max_tokens,
                'temperature': temperature,
                'top_p': top_p,
                'presence_penalty': presence_penalty,
                'frequency_penalty': frequency_penalty,
                'stop': stop,
            },
            'counts': {
                'empty': 0 if continuations else 1
            }
        }
    except openai.error.AuthenticationError as e:
        results = {
            'status': FAILURE,
            'message': f"Authentication error: {str(e)}"
        }
    except openai.error.InvalidRequestError as e:
        results = {
            'status': FAILURE,
            'message': f"Invalid request error: {str(e)}"
        }
    except Exception as e:
        results = {
            'status': FAILURE,
            'message': f"An error occurred: {str(e)}"
        }
        print(e)

    return jsonify(results)

@app.route('/api/get_log', methods=['POST'])
@cross_origin(origin='*')
def get_log():
    results = dict()

    content = request.json
    session_id = content['sessionId']
    domain = content['domain'] if 'domain' in content else None

    # Retrieve the latest list of logs
    log_paths = retrieve_log_paths(args.replay_dir)

    try:
        log_path = log_paths[session_id]
        log = read_log(log_path)
        results['status'] = SUCCESS
        results['logs'] = log
    except Exception as e:
        results['status'] = FAILURE
        results['message'] = str(e)

    if results['status'] == FAILURE:
        return results

    # Populate metadata
    try:
        stats = compute_stats(log)
        last_text = get_last_text_from_log(log)
        config = get_config_for_log(
            session_id,
            metadata,
            metadata_path
        )
    except Exception as e:
        print(f'# Failed to retrieve metadata for the log: {e}')
        stats = None
        last_text = None
        config = None
    results['stats'] = stats
    results['config'] = config
    results['last_text'] = last_text

    print_verbose('Get log', results, verbose)
    return results

@app.route('/api/save_user_info', methods=['POST'])
@cross_origin(origin='*')
def save_user_info():
    content = request.json
    code = content.get('code')
    results = {}

    try:
        # 添加时间戳
        content['timestamp'] = time()

        # 文件路径
        path = os.path.join(proj_dir, f"{code}_userinfo.json")

        # 使用和 end_session 一致的保存函数
        save_info_to_json(path, content)

        results['status'] = SUCCESS
        results['path'] = path
    except Exception as e:
        results['status'] = FAILURE
        results['message'] = str(e)
        print(e)

    return jsonify(results)

if __name__ == '__main__':
    parser = ArgumentParser()

    # Required arguments
    parser.add_argument('--config_dir', type=str, required=True)
    parser.add_argument('--log_dir', type=str, required=True)
    parser.add_argument('--port', type=int, required=True)
    parser.add_argument('--proj_name', type=str, required=True)

    # Optional arguments
    parser.add_argument('--replay_dir', type=str, default='../logs')

    parser.add_argument('--debug', action='store_true')
    parser.add_argument('--verbose', action='store_true')

    parser.add_argument('--use_blocklist', action='store_true')

    global args
    args = parser.parse_args()

    # Create a project directory to store logs
    global config_dir, proj_dir
    config_dir = args.config_dir
    proj_dir = os.path.join(args.log_dir, args.proj_name)
    if not os.path.exists(args.log_dir):
        os.mkdir(args.log_dir)
    if not os.path.exists(proj_dir):
        os.mkdir(proj_dir)

    # Create a text file for storing metadata
    global metadata_path
    metadata_path = os.path.join(args.log_dir, 'metadata.txt')
    if not os.path.exists(metadata_path):
        with open(metadata_path, 'w') as f:
            f.write('')

    # Read and set API keys
    global api_keys
    api_keys = read_api_keys(config_dir)
    openai.api_key = api_keys[('openai', 'default')]

    # Read examples (hidden prompts), prompts, and a blocklist
    global examples, prompts, blocklist
    examples = read_examples(config_dir)
    prompts = read_prompts(config_dir)
    blocklist = []
    if args.use_blocklist:
        blocklist = read_blocklist(config_dir)
        print(f' # Using a blocklist: {len(blocklist)}')

    # Read access codes
    global allowed_access_codes
    allowed_access_codes = read_access_codes(config_dir)

    global session_id_history
    metadata = dict()
    metadata = update_metadata(
        metadata,
        metadata_path
    )

    global verbose
    verbose = args.verbose

    app.run(
        host='0.0.0.0',
        port=args.port,
        debug=args.debug,
    )



