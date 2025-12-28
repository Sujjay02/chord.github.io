const synth = new Tone.PolySynth(Tone.Synth).toDestination();
const pianoContainer = document.getElementById('piano');

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

// Load songs from memory as soon as the page opens
document.addEventListener('DOMContentLoaded', displaySongs);

function saveSong() {
    const title = document.getElementById('songTitle').value.trim();
    const result = document.getElementById('resultText').innerText;

    if (!title || result === "--") {
        alert("Please enter a title and transpose something first!");
        return;
    }

    const song = {
        id: Date.now(),
        title: title,
        data: result
    };

    // Get existing songs or start a new list
    let library = JSON.parse(localStorage.getItem('myTransposerLibrary')) || [];
    library.push(song);
    
    // Save back to browser memory
    localStorage.setItem('myTransposerLibrary', JSON.stringify(library));
    
    document.getElementById('songTitle').value = ""; // Clear title input
    displaySongs();
}

function displaySongs() {
    const list = document.getElementById('songsList');
    const library = JSON.parse(localStorage.getItem('myTransposerLibrary')) || [];
    
    list.innerHTML = library.map(song => `
        <li style="display: flex; justify-content: space-between; background: #2d2d2d; padding: 8px; border-radius: 5px; margin-bottom: 5px; font-size: 0.9rem;">
            <span><strong>${song.title}:</strong> ${song.data}</span>
            <button onclick="deleteSong(${song.id})" style="background:none; border:none; color:#ff4444; cursor:pointer;">✕</button>
        </li>
    `).join('');
}

function deleteSong(id) {
    let library = JSON.parse(localStorage.getItem('myTransposerLibrary')) || [];
    library = library.filter(s => s.id !== id);
    localStorage.setItem('myTransposerLibrary', JSON.stringify(library));
    displaySongs();
}

function downloadSongAsFile() {
    const title = document.getElementById('songTitle').value || "transposed-song";
    const content = document.getElementById('resultText').innerText;
    
    const element = document.createElement('a');
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${title}.txt`;
    document.body.appendChild(element); 
    element.click();
}