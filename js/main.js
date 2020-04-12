'use strict';

// Prep globals, taking care of vendor-prefixed forms.
var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

init();

function init() {
  if (!('speechSynthesis' in window )) {
    console.error('SpeechSynthesis is not supported.');
    return;
  }
  // TODO
  //initAlphabet(document.getElementById('alphabet'));
  initSpeechQuery(document.getElementById('start-query'));
}

function initAlphabet(alphabet) {
  // Voices are loaded async, so might not be available.
  // Wait until voices are loaded before initializing the app.
  if (!window.speechSynthesis.getVoices().length) {
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      initAlphabet(alphabet);
    }, { once: true });
    return;
  }
  const voice = getDutchVoice(window.speechSynthesis.getVoices());
  console.log('Chosen voice:', voice.voiceURI);
  if (voice === undefined) {
    console.error('Unable to find Dutch voice.');
  }
  alphabet.addEventListener('click', e => {
    if (!e.target.hasAttribute('data-speak')) {
      return;
    }
    speak(e.target.getAttribute('data-speak'));
  });
}

function initSpeechQuery(button) {
  const recognition = new SpeechRecognition();
  const speechRecognitionList = new SpeechGrammarList();
  //speechRecognitionList.addFromString(grammar, 1);
  //recognition.grammars = speechRecognitionList;
  recognition.continuous = false;
  recognition.lang = 'nl-NL';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.addEventListener('speechend', () => {
    console.log('speechend event');
    recognition.stop();
  });
  recognition.addEventListener('result', e => {
    const response = e.results[0][0].transcript;
    const utterance = new SpeechSynthesisUtterance(response);
    utterance.lang = 'nl';
    window.speechSynthesis.speak(utterance);
    console.log(response);
  });
  recognition.addEventListener('start', e => {
    console.log('Voice recognition activated.');
  });

  button.addEventListener('click', () => {
    console.log('starting recognition');
    recognition.start();
  });
}

function speak(message) {
  console.log('I\'m going to say:', message);
  const utterance = new SpeechSynthesisUtterance(message);
  if (window.speechSynthesis.speaking) {
    console.error('speechSynthesis.speaking');
    return;
  }
  utterance.onend = function (event) {
    console.log('SpeechSynthesisUtterance.onend');
  }
  utterance.onerror = function (event) {
    console.error(event);
  }

  utterance.lang = 'nl';
  utterance.pitch = 1;
  utterance.rate = 1.2;
  window.speechSynthesis.speak(utterance);
}

function getDutchVoice(voiceList) {
  const dutchVoices = voiceList.filter(v => v.lang.startsWith('nl'));
  const googleDutch = dutchVoices.find(x => x.voiceURI === 'Google Nederlands');
  return googleDutch
    // Prefer "Google Nederlands"...
    ? googleDutch
    // ...but something's better than nothing.
    : dutchVoices[0];
}
