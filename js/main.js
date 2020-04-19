'use strict';

// Prep globals, taking care of vendor-prefixed forms.
var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

// Map common mishearings to valid results.
const VISUAL_CORRECTIONS = {
  'a': 'aa',
  'i': 'ie',
  'e': 'ee',
  'o': 'oo',
  'u': 'uu',
  'y': 'ei',
  'q': 'oe',
  'hoe': 'oeh',
  'eruit': 'ui',
  'rui': 'ui',
};
const AUDITIVE_CORRECTIONS = {
  // Choose some likely sounds over otherwise valid options.
  // Note that this disables "Q" and "Y" from being chosen.
  'y': 'ei',
  'q': 'oeh',
  'hoe': 'oeh',
  'eruit': 'ui',
  'rui': 'ui',
  'eu': 'euh',
};

init();

function init() {
  if (!('speechSynthesis' in window )) {
    console.error('SpeechSynthesis is not supported.');
    return;
  }

  // Voices are loaded async, so might not be available.
  // Wait until voices are loaded before initializing the app.
  if (!window.speechSynthesis.getVoices().length) {
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      init();
    }, { once: true });
    return;
  }
  const voice = getDutchVoice(window.speechSynthesis.getVoices());
  console.log('Chosen voice:', voice.voiceURI);
  if (voice === undefined) {
    console.error('Unable to find Dutch voice.');
  }

  initSpeechQuery(
    document.getElementById('start-query'),
    document.getElementById('feedback')
  );
}

function initSpeechQuery(button, feedback) {
  const recognition = getRecognition(button, feedback);

  button.addEventListener('mousedown', () => {
    console.group('Starting recognition');
    recognition.start();
  });
}

function speak(message) {
  console.log('I\'m going to say: "' + message + '"');
  const utterance = new SpeechSynthesisUtterance(message);
  if (window.speechSynthesis.speaking) {
    console.error('speechSynthesis.speaking');
    return;
  }
  utterance.addEventListener('error', e => {
    console.error(e);
  });

  utterance.lang = 'nl';
  utterance.pitch = 1;
  utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
  return new Promise((yay, nay) => {
    utterance.addEventListener('end', yay, { once: true });
    utterance.addEventListener('error', nay, { once: true });
  });
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

function getRecognition(button, feedback) {
  const recognition = getRecognitionObject();

  recognition.addEventListener('speechend', () => {
    console.log('Voice recognition ended.');
    recognition.stop();
    button.classList.remove('is-listening');
  });

  recognition.addEventListener('error', e => {
    console.error(e);
  });

  recognition.addEventListener('result', e => {
    button.classList.remove('is-listening');
    const response = e.results[0][0].transcript;
    const { message, word, continuation } = inputIsUnderstandable(response)
      ? getSuccessfulAudioResponse(response)
      : getDisappointingAudioResponse(response);

    speak(message).then(() => {
      console.log('Done speaking');
      // Account for ambigious sounds that yield multiple results.
      if (Array.isArray(word) && continuation !== undefined) {
        speak(continuation);
        appendWord(feedback, ' ' + word[1]);
      }
    });

    if (word) {
      appendWord(feedback, Array.isArray(word) ? word[0] : word);
    }
    console.log('This is what I heard: "' + response + '"');
    console.groupEnd();
  });
  recognition.addEventListener('start', e => {
    button.classList.add('is-listening');
    feedback.textContent = '';
  });

  return recognition;
}

function appendWord(feedback, word) {
  const span = document.createElement('span');
  span.textContent = word;
  feedback.appendChild(span);
}

function getGrammar() {
  // Note: this doesn't seem to do much.
  const sounds = ['a', 'o', 'e', 'u', 'i', 'ie', 'euh', 'oeh', 'ui', 'ei'];
  return `#JSGF V1.0; grammar colors; public <sound> = ${sounds.join(' | ')} ;`;
}

function inputIsUnderstandable(response) {
  return response.startsWith('Hoe schrijf je');
}

function getSuccessfulAudioResponse(response) {
  const SHORT_REQUEST = 'Hoe schrijf je ';
  const LONG_REQUEST = `${SHORT_REQUEST}de `;
  const isLongRequest = response.startsWith(LONG_REQUEST);
  const requestedWord = isLongRequest
    ? response.substr(LONG_REQUEST.length)
    : response.substr(SHORT_REQUEST.length);
  const interpretedWord = correctAuditively(requestedWord)
  const feedback = `${isLongRequest ? 'De ' : ''}"${interpretedWord}" schrijf je zo:`;

  // A pair of hard-coded ambiguous sounds.
  if (requestedWord === 'au') {
    return {
      message: feedback,
      continuation: 'Óf zo:',
      word: ['au', 'ou'],
    };
  } else if (requestedWord === 'y') {
    return {
      message: feedback,
      continuation: 'Óf zo:',
      word: ['ei', 'ij'],
    };
  }

  return {
    message: feedback,
    word: correctVisually(requestedWord),
  };
}

function getRecognitionObject() {
  const recognition = new SpeechRecognition();
  const speechRecognitionList = new SpeechGrammarList();
  speechRecognitionList.addFromString(getGrammar(), 1);
  recognition.grammars = speechRecognitionList;
  recognition.continuous = false;
  recognition.lang = 'nl-NL';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  return recognition;
}

/**
 * Try to fix common "mishearings" and nudge towards valid results.
 */
function correctVisually(word) {
  return word in VISUAL_CORRECTIONS ? VISUAL_CORRECTIONS[word] : word;
}

function correctAuditively(word) {
  return word in AUDITIVE_CORRECTIONS ? AUDITIVE_CORRECTIONS[word] : word;
}

function getDisappointingAudioResponse() {
  const options = [
    'Ik heb je niet helemaal begrepen.',
    'Kun je het iets duidelijker zeggen?',
    'Sorry, die vraag begrijp ik niet.',
    'Ik heb het niet goed gehoord. Wil je het nog eens proberen?',
    'Kun je iets langzamer praten?',
    'Ik snap niet wat je bedoeld.',
    'Sorry, dat snap ik niet helemaal.',
    'Probeer het nog eens.',
  ]
  return {
    message: options[Math.floor(Math.random() * options.length)]
  };
}
