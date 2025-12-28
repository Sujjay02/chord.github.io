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
    if (Tone.context.state !== 'running') await Tone.start();
    
    // Get the current mode from the dropdown
    const type = document.getElementById('typeSelect').value;
    const text = document.getElementById('resultText').innerText;
    if (text === "--") return;

    const items = text.split(/\s+/);
    let now = Tone.now();
    
    items.forEach((item, index) => {
        let notesToPlay = [];

        // 1. Strictly follow the user's chosen mode
        if (type === 'chord' || type === 'numeral') {
            // In these modes, we treat it as a chord and play all notes
            const chordNotes = Tonal.Chord.get(item).notes;
            notesToPlay = chordNotes.length > 0 ? chordNotes : [item];
        } else {
            // In 'note' mode, we ONLY play the single note
            notesToPlay = [item];
        }
        
        const formatted = notesToPlay.map(n => {
            let s = Tonal.Note.simplify(n);
            let fullNote = /\d/.test(s) ? s : s + "4";
            
            // Highlight Piano Key
            setTimeout(() => {
                const k = document.querySelector(`[data-note="${fullNote}"]`);
                if (k) {
                    k.classList.add('active');
                    setTimeout(() => k.classList.remove('active'), 400);
                }
            }, (now + (index * 0.5) - Tone.now()) * 1000);

            return fullNote;
        });

        // Trigger the sound (Single note or full chord)
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