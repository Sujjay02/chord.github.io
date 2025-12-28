
function handleTranspose() {
    const type = document.getElementById('typeSelect').value;
    const input = document.getElementById('userInput').value.trim();
    const semitones = parseInt(document.getElementById('semitones').value);
    
    if (!input) {
        alert("Please enter some notes or chords first!");
        return;
    }

    const interval = Tonal.Interval.fromSemitones(semitones);
    const items = input.split(/\s+/); 

    const transposedItems = items.map(item => {
        try {
            let result;
            if (type === 'note') {
                result = Tonal.Note.transpose(item, interval);
            } else if (type === 'chord') {
                result = Tonal.Chord.transpose(item, interval);
            } else if (type === 'scale') {
                result = Tonal.Scale.transpose(item, interval);
            }
            // If Tonal returns null, return the original item
            return result || item; 
        } catch (e) {
            return item; 
        }
    });

    const finalResult = transposedItems.join(" ");
    document.getElementById('resultText').innerText = finalResult;

    // Show action buttons
    document.getElementById('copyBtn').style.display = "block";
    document.getElementById('playBtn').style.display = "block";
}

function copyToClipboard() {
    const text = document.getElementById('resultText').innerText;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyBtn');
        const originalText = btn.innerText;
        btn.innerText = "Copied!";
        setTimeout(() => { btn.innerText = originalText; }, 2000);
    });
}

// Use a PolySynth so it can play multiple notes at once if needed
const synth = new Tone.PolySynth(Tone.Synth).toDestination();

async function playMusic() {
    try {
        // 1. Ensure Audio Context is started
        await Tone.start();
        console.log("Audio Context Started");

        const text = document.getElementById('resultText').innerText;
        if (text === "--") return;

        const items = text.split(/\s+/);
        let now = Tone.now();
        
        items.forEach((item, index) => {
            // 2. Get the notes for the item (works for single notes OR chords)
            let notesToPlay = [];
            
            if (Tonal.Chord.get(item).notes.length > 0) {
                // It's a chord! Get all notes in the chord
                notesToPlay = Tonal.Chord.get(item).notes;
            } else {
                // It's a single note
                notesToPlay = [item];
            }

            // 3. Format notes for Tone.js (Ensure they have an octave like '4')
            const formattedNotes = notesToPlay.map(n => {
                let simplified = Tonal.Note.simplify(n);
                return /\d/.test(simplified) ? simplified : simplified + "4";
            });

            // 4. Schedule the sound
            // triggerAttackRelease(notes, duration, time)
            synth.triggerAttackRelease(formattedNotes, "4n", now + (index * 0.5));
        });
} catch (error) {
    console.error("Playback Error:", error);
}
}