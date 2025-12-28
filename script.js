
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
    // 1. FORCE THE AUDIO CONTEXT TO START
    // This handles the "User Gesture" requirement explicitly
    if (Tone.context.state !== 'running') {
        await Tone.start();
        console.log("Audio Context forced to start!");
    }

    const text = document.getElementById('resultText').innerText;
    if (!text || text === "--") return;

    const items = text.split(/\s+/);
    let now = Tone.now();
    
    items.forEach((item, index) => {
        let notesToPlay = [];
        
        // Check if it's a chord or a single note
        const chordData = Tonal.Chord.get(item);
        if (chordData.notes.length > 0) {
            notesToPlay = chordData.notes;
        } else {
            notesToPlay = [item];
        }

        // Format for Tone.js (Ensure octave exists, e.g., "C4")
        const formattedNotes = notesToPlay.map(n => {
            let simplified = Tonal.Note.simplify(n);
            // If note has no number, add '4' (Middle C range)
            return /\d/.test(simplified) ? simplified : simplified + "4";
        });

        // Only play if notes are valid
        if (formattedNotes.length > 0 && formattedNotes[0] !== "undefined4") {
            // Schedule playback: 0.5s delay between each item
            synth.triggerAttackRelease(formattedNotes, "4n", now + (index * 0.5));
        }
    });
}