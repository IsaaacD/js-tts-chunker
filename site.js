window.utterances = [];

// from https://stackoverflow.com/a/50285928

var options = {};
options['separateWordSearch'] = false;
options['diacritics'] = false;
options['debug'] = false;
options['acrossElements'] = true;
//options["exclude"] =  ['.ignore-tts']
var playing = false;
var paused = true;
let voices = [];
const voicesOptions = document.getElementById('voices');
const hasSynth = 'speechSynthesis' in window;
$(function () {

    $('[data-toggle="tooltip"]').tooltip();

    const synth = window.speechSynthesis;
    let voices = [];

    if ('speechSynthesis' in window) {
        // Speech Synthesis supported
    } else {
        // Speech Synthesis Not Supported
        alert("Sorry, your browser doesn't support text to speech!");
    }

    populateVoiceList();

    if (typeof synth !== 'undefined' && synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = populateVoiceList;
    }

    var selectedLang = 'en-US';
    var selectedVoice = '$("#voices").find("option").attr("data-pos")';
    $('.dropdown-menu').click(function (e) {
        e.stopPropagation();
    });
    $('#dropdownMenuLink').click(function (e) {
        //e.stopPropagation();
        loadChunks('#main');
    });
    $('#nextButton').click(function (e) {
        var val = chunkIndex + 1;
        if (val > maxChunkIndex) {
            val = 0;
        }
        updateChunkIndex(val);
        markCurrentIndex();
        document.getElementById('text-loc').innerText = val + '/' + (maxChunkIndex);
        document.getElementById('textSlider').value = parseInt(val);
        if (playing && !paused) {
            speakNext();
        }

    });
    $('#prevButton').click(function (e) {
        var val = chunkIndex - 1;
        if (val < 0) {
            val = maxChunkIndex;
        }
        updateChunkIndex(val);
        markCurrentIndex();
        document.getElementById('text-loc').innerText = val + '/' + (maxChunkIndex);
        document.getElementById('textSlider').value = parseInt(val);
        if (playing && !paused) {
            speakNext();
        }
    });
    $("#voices").change(function (e) {
        e.stopPropagation();
        selectedVoice = $(this).find("option:selected").attr("data-pos");
        selectedLang = $(this).find("option:selected").attr("data-lang");
        updateVoice(voices[selectedVoice]);
        updateLang(selectedLang);
    });


    function populateVoiceList() {
        voices = synth.getVoices();
        console.log('voices: ', voices, voices.length);
        if (typeof speechSynthesis === 'undefined') {
            return;
        }

        voices.forEach((item, index) => {
            const option = document.createElement('option');
            option.textContent = `${item.name} (${item.lang})`;
            option.setAttribute('data-lang', item.lang);
            option.setAttribute('data-name', item.name);
            option.setAttribute('data-voice-uri', item.voiceURI);
            option.setAttribute('data-pos', index);
            if (item.lang === 'en-US') {
                option.selected = true;
            }
            document.getElementById("voices").appendChild(option);
        });
    }

    document.getElementById('speedSlider').addEventListener('input', function () {
        updateRate(this.value);
        document.getElementById('text-speed').innerText = this.value;
    });
    var sliderTimeout = null
    document.getElementById('textSlider').addEventListener('input', function () {
        if (sliderTimeout) {
            clearTimeout(sliderTimeout);
        }

        var captured = parseInt(document.getElementById('textSlider').value);
        if(captured > maxChunkIndex) {
            captured = maxChunkIndex;
        }else if(captured < 0){
            captured = 0;
        }

        sliderTimeout = setTimeout(() => {
            if(playing && paused) {
                paused = false; // don't want to resume at last paused
                playing = false;
            }

            updateChunkIndex(captured);
            markCurrentIndex();
            document.getElementById('text-loc').innerText = (captured) + '/' + (maxChunkIndex);
            if (playing && !paused) {
                speakNext();
            }
            sliderTimeout = null;

        }, 10);
    });

    document.getElementById('playButton').addEventListener('click', function () {
        //create an utterance as you normally would...

        if (playing && paused) {
            paused = false;
            synth.resume();
            return;
        }
        gtag('event', 'view_item', {
            'currency': "USD",
            'value': '0.00',
            'items': [{
                'id': 'audio-tts-start',
                'name': window.location,
                'category': 'listening'
            }]
        });
        speakNext();

    });
    window.addEventListener("beforeChunk", (ev) => {
        document.getElementById('text-loc').innerText = (chunkIndex + 1) + '/' + (maxChunkIndex);
    });
    window.addEventListener("loadedChunks", (ev) => {
        document.getElementById('textSlider').max = ev.detail.count;
        document.getElementById('text-loc').innerText = '0/' + (maxChunkIndex);
    });
    var speakTimeout = null;
    function speakNext() {
        paused = false;
        if (speakTimeout) {
            clearTimeout(speakTimeout);
        }
        speakTimeout = setTimeout(() => {
            synth.cancel();
            playing = true;
            var utterance = new SpeechSynthesisUtterance();
            utterance.lang = selectedLang;
            utterance.voice = voices[selectedVoice];
            utterance.rate = rate;
            utterances.push(utterance); // keep in memeory?



            // utterance.addEventListener('boundary', function (evt) {
            //     onboundaryHandler(evt);
            //     console.log(evt);
            // });
            // utterance.onboundary = onboundaryHandler;
            //pass it into the chunking function to have it played out.
            //you can set the max number of characters by changing the chunkLength property below.
            //a callback function can also be added that will fire once the entire text has been spoken.

            //findChunks(utterance);
            speechUtteranceChunker(utterance, {
                chunkLength: 120
            }, function () {
                //some code to execute when done
                speakTimeout = null;
                console.log('done');
                markInstance.unmark();
            });

        }, 5);
    }

    document.getElementById('stopButton').addEventListener('click', function () {
        if (synth) {
            synth.pause();
            paused = true;
            // synth.cancel();
            if (playing) {
                gtag('event', 'view_item', {
                    'currency': "USD",
                    'value': '0.00',
                    'items': [{
                        'id': 'audio-tts-stop',
                        'name': window.location,
                        'category': 'listening'
                    }]
                });
            }
        }
    });

    addEventListener("beforeunload", (event) => {
        synth.pause();
        paused = true;
        playing = false;
        synth.cancel();
        if (playing) {
            gtag('event', 'view_item', {
                'currency': "USD",
                'value': '0.00',
                'items': [{
                    'id': 'audio-tts-unload',
                    'name': window.location,
                    'category': 'listening'
                }]
            });
        }
    });

    $('[data-toggle="tooltip"]').on('shown.bs.tooltip', function () {
        // do something…
        //console.log('shown tooltip', this);
        gtag('event', 'view_item', {
            'currency': "USD",
            'value': '0.00',
            'items': [{
                'id': 'tooltip',
                'name': this.dataset.originalTitle,
                'category': 'tooltip'
            }]
        });
    });

});
