const synth = new Tone.PolySynth(Tone.Synth).toDestination();
const pianoContainer = document.getElementById('piano');

// 1. Generate Piano Keys
const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
for (let i = 0; i < 24; i++) { // 2 octaves
    const note = notes[i % 12];
    const key = document.createElement('div');
    key.className = `key ${note.includes('#') ? 'black' : ''}`;
    key.dataset.note = `${note}${Math.floor(i/12) + 3}`; // Octaves 3 and 4
    pianoContainer.appendChild(key);
}

function handleTranspose() {
    const type = document.getElementById('typeSelect').value;
    const input = document.getElementById('userInput').value.trim();
    const semitones = parseInt(document.getElementById('semitones').value);
    const keySig = document.getElementById('keyInput').value;
    const accidental = document.getElementById('accidentalType').value;
    
    if (!input) return;
    const interval = Tonal.Interval.fromSemitones(semitones);
    const items = input.split(/\s+/); 

    const transposedItems = items.map(item => {
        try {
            let res;
            if (type === 'numeral') {
                // Roman Numeral to Note (e.g., "I" in "C" -> "C")
                const note = Tonal.RomanNumeral.get(item).empty ? item : Tonal.Progression.fromRomanNumerals(keySig, [item])[0];
                res = Tonal.Note.transpose(note, interval);
            } else if (type === 'chord') {
                res = Tonal.Chord.transpose(item, interval);
            } else {
                res = Tonal.Note.transpose(item, interval);
            }

            // Smart Accidental Logic
            if (accidental === 'sharp') return Tonal.Note.simplify(res).replace(/b/g, '#');
            if (accidental === 'flat') return Tonal.Note.enharmonic(res);
            return Tonal.Note.simplify(res);
        } catch (e) { return item; }
    });

    document.getElementById('resultText').innerText = transposedItems.join(" ");
    playMusic();
}

async function playMusic() {
    await Tone.start();
    const items = document.getElementById('resultText').innerText.split(/\s+/);
    let now = Tone.now();
    
    items.forEach((item, index) => {
        let notesToPlay = Tonal.Chord.get(item).notes.length > 0 ? Tonal.Chord.get(item).notes : [item];
        
        const formatted = notesToPlay.map(n => {
            let s = Tonal.Note.simplify(n);
            let final = /\d/.test(s) ? s : s + "4";
            
            // Highlight Piano Key
            setTimeout(() => {
                const key = document.querySelector(`[data-note="${final}"]`);
                if (key) {
                    key.classList.add('active');
                    setTimeout(() => key.classList.remove('active'), 400);
                }
            }, (now + (index * 0.5) - Tone.now()) * 1000);

            return final;
        });

        synth.triggerAttackRelease(formatted, "4n", now + (index * 0.5));
    });
}

function clearAll() {
    document.getElementById('userInput').value = '';
    document.getElementById('resultText').innerText = '--';
}

function copyToClipboard() {
    navigator.clipboard.writeText(document.getElementById('resultText').innerText);
}