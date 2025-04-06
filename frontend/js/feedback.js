function getSelectedCheckboxValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
              .map(cb => cb.value);
}

function enableSubmitIfValid() {
  const age = document.getElementById("age").value.trim();
  const gender = document.getElementById("gender").value.trim();

  if (age && gender) {
    document.getElementById("submit-btn").disabled = false;
  } else {
    document.getElementById("submit-btn").disabled = true;
  }
}
function highlightInvalidField(id, valid) {
  const el = document.getElementById(id);
  if (valid) {
    el.classList.remove('invalid');
  } else {
    el.classList.add('invalid');
  }
}

function validateFormData(data) {
  const requiredFields = [
    'age', 'gender', 'education', 'occupation', 'ethnicity',
    'englishVariety', 'otherLanguages', 'currentLocation',
    'previousLocations', 'aiFamiliarity', 'aiFrequency', 'aiOpinion', 'consent'
  ];

  const missing = [];

  for (let field of requiredFields) {
    const value = data[field];
    const valid = value && value.trim() !== '';
    highlightInvalidField(field, valid);
    if (!valid) missing.push(field);
  }

  // Checkbox groups
  if (data.aiTools.length === 0) missing.push("aiTools");
  if (data.aiPurposes.length === 0) missing.push("aiPurposes");

  return missing;
}

document.querySelectorAll('#user-info-form input, #user-info-form select').forEach(el => {
  el.addEventListener('input', enableSubmitIfValid);
  el.addEventListener('change', enableSubmitIfValid);
});

document.getElementById('user-info-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const getCheckboxGroupValues = (prefix) => {
    return Array.from(document.querySelectorAll(`input[id^="${prefix}"]:checked`)).map(el => el.value);
  };

  const formData = {
    age: document.getElementById('age').value,
    gender: document.getElementById('gender').value,
    education: document.getElementById('education').value,
    occupation: document.getElementById('occupation').value,
    ethnicity: document.getElementById('ethnicity').value,
    englishVariety: document.getElementById('englishVariety').value,
    otherLanguages: document.getElementById('otherLanguages').value,
    currentLocation: document.getElementById('currentLocation').value,
    previousLocations: document.getElementById('previousLocations').value,
    aiFamiliarity: document.getElementById('aiFamiliarity').value,
    aiTools: [
      ...getCheckboxGroupValues('tool-'),
      document.getElementById('tool-other').value
    ].filter(Boolean),
    aiFrequency: document.getElementById('aiFrequency').value,
    aiPurposes: [
      ...getCheckboxGroupValues('use-'),
      document.getElementById('use-other').value
    ].filter(Boolean),
    aiOpinion: document.getElementById('aiOpinion').value,
    consent: document.querySelector('input[name="consent"]:checked')?.value || '',
  };

  const type = new URLSearchParams(window.location.search).get('type') || 'a';
  const code = getUrlParameter('code'); // get type from the url
  formData.code = code;
  const missingFields = validateFormData(formData);
    if (missingFields.length > 0) {
      const fieldNames = {
          age: "Age",
          gender: "Gender",
          education: "Education",
          occupation: "Occupation",
          ethnicity: "Ethnicity",
          englishVariety: "English Variety",
          otherLanguages: "Other Languages",
          currentLocation: "Current Location",
          previousLocations: "Previous Locations",
          aiFamiliarity: "AI Familiarity",
          aiFrequency: "AI Usage Frequency",
          aiOpinion: "Your Opinion",
          consent: "Consent",
          aiTools: "Which AI tools have you used in the past 3 months?",
          aiPurposes: "What are your primary purposes for using AI?"
        };

        alert("Please complete the following fields:\n\n" +
          missingFields.map(f => fieldNames[f] || f).join(", "));

      return;
    }

  $.ajax({
    url: serverURL + '/api/save_user_info',
    beforeSend: function () {
      $('#next-page-btn').text("Saving...").prop("disabled", true);
    },
    type: 'POST',
    dataType: 'json',
    data: JSON.stringify(formData),
    contentType: 'application/json; charset=utf-8',
    success: function (res) {
      if (res.status === true) {
        window.location.href = `completed.html`;
      } else {
        alert("Save failed: " + res.message);
        $('#next-page-btn').prop("disabled", false).text("Next Page");
      }
    },
    error: function () {
      alert("Could not save your response. Please try again.");
      $('#next-page-btn').prop("disabled", false).text("Next Page");
    }
  });
});
