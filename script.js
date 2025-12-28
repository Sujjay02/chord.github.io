// Initialize a simple synth for the "Listen" feature
const synth = new Tone.Synth().toDestination();

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

async function playMusic() {
    await Tone.start(); // Required to unlock audio in browsers
    
    const text = document.getElementById('resultText').innerText;
    const items = text.split(/\s+/);
    let time = Tone.now();
    
    items.forEach(item => {
        // Find a playable note. If it's a chord, get the root note.
        let noteName = Tonal.Note.simplify(item) || Tonal.Chord.get(item).notes[0];
        
        // Add a default octave (4) if the user didn't provide one
        if (noteName && !/\d/.test(noteName)) {
            noteName += "4";
        }

        if (noteName && Tone.Frequency(noteName).isValid) {
            synth.triggerAttackRelease(noteName, "8n", time);
            time += 0.4; // Delay between notes
        }
    });
}