/**
 * Chunkify
 * Google Chrome Speech Synthesis Chunking Pattern
 * Fixes inconsistencies with speaking long texts in speechUtterance objects 
 * Licensed under the MIT License
 *
 * Peter Woolley and Brett Zamir
 */
var totalTextUsed = 0;
var lastChunk = '';
var synth = window.speechSynthesis;
var rate = 1.0;
var voice = null;
var lang = 'en-US';
var multiLineRegex =  /((?:[^.!?]+[:).!?]+\n?)),?/g;
var chunks = [];
var chunkIndex = 0;
var maxChunkIndex = 0;
var markInstance = null;
var synth = window.speechSynthesis;

var loadChunks = function(element) {
    if(chunks.length > 0) return;

    var markEle = document.querySelector(element);
    var text = markEle.innerText;
    var chunkArr = text.match(multiLineRegex);

    if(chunkArr === null) {
        console.log('no chunks found');
    }
    else {
        chunks = chunkArr;
        maxChunkIndex = chunks.length;
        markInstance = new Mark(markEle);
        console.log('chunks loaded');
    }
    window.dispatchEvent(new CustomEvent('loadedChunks', { detail: { count: maxChunkIndex } }));
    //console.log(chunks);
}
var updateChunkIndex = function(index) {
    chunkIndex = index;
    // if(chunkIndex < 0) {
    //     chunkIndex = maxChunkIndex - 1;
    // }else if(chunkIndex >= maxChunkIndex) {
    //     chunkIndex = 0;
    // }
    
}

var speechUtteranceChunker = function (utt, settings, callback) {

    if(!chunks || chunks.length === 0) {
        alert('Error loading text. Please refresh the page and try again.');
        return;
    }
    settings = settings || {};

    var newUtt;

    var txt = chunks[chunkIndex];
    if (utt.voice && utt.voice.voiceURI === 'native') { // Not part of the spec, this prob doesn't work
        newUtt = utt;
        newUtt.text = txt;
        newUtt.addEventListener('end', function () {
            if (speechUtteranceChunker.cancel) {
                speechUtteranceChunker.cancel = false;
            }
            if (callback !== undefined) {
                callback();
            }
        });
    }
    else {

        var currChunk = chunks[chunkIndex];
        console.log(currChunk);
        if (currChunk === undefined || currChunk === null || currChunk.length <= 2){
            //call once all text has been spoken...
            if (callback !== undefined) {
                callback();
                console.log('doing the callback because we are done');
            }
            return;
        }
        var chunk = currChunk;
        lastChunk = chunk;
        newUtt = new SpeechSynthesisUtterance(chunk);
        newUtt.rate = rate;
        newUtt.voice = voice || utt.voice;
        newUtt.lang = lang || utt.lang;
        var x;
        for (x in utt) {
            if (utt.hasOwnProperty(x) && x !== 'text') {
                newUtt[x] = utt[x];
            }
        }
        newUtt.addEventListener('end', function () {
            chunkIndex++;
            if (speechUtteranceChunker.cancel) {
                speechUtteranceChunker.cancel = false;
                return;
            }

            settings.offset = settings.offset || 0;
            settings.offset += chunk.length - 1;
            speechUtteranceChunker(utt, settings, callback);
        });
    }
    //if (lastChunk.length > 2) {

        if (settings.modifier) {
            settings.modifier(newUtt);
        }

        window.dispatchEvent(new CustomEvent('beforeChunk', { detail: { utterance: newUtt } }));

        onboundaryHandler(newUtt.text);
        console.log(newUtt); //IMPORTANT!! Do not remove: Logging the object out fixes some onend firing issues.
        //placing the speak invocation inside a callback fixes ordering and onend issues.
        setTimeout(function () {
            synth.speak(newUtt);
        }, 0);
   // }
};

function updateRate(iRate) {
    rate = iRate;
}

function updateVoice(iVoice) {
    voice = iVoice;
}

function updateLang(iLang) {
    lang = iLang;
}

function onboundaryHandler(word) {
    performMark(word);
};
function markCurrentIndex(){
    performMark(chunks[chunkIndex]);
}

function performMark(words) {
    // Remove previous marked elements and mark
    // the new keyword inside the context
    markInstance.unmark({
        done: function () {
            markInstance.mark(words.trim(), options);
            var marks = document.getElementsByTagName('mark');
            if (marks && marks.length > 0)
                marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            else if(chunkIndex === 0){
                window.scrollTo(0, 0);
            }
        }
    });
};