// --- 1. FIREBASE INITIALIZATION (Compat Version) ---
const firebaseConfig = {
  apiKey: "AIzaSyCMeZwHTGIQWOpMfVvNfTO9C_yJkcMnG1U",
  authDomain: "music-transposer-ab68a.firebaseapp.com",
  projectId: "music-transposer-ab68a",
  storageBucket: "music-transposer-ab68a.firebasestorage.app",
  messagingSenderId: "660024442596",
  appId: "1:660024442596:web:efb22145e41540a6b536f1"
};

// Use the global 'firebase' object provided by the scripts in your index.html
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- 2. AUDIO & PIANO SETUP ---
const synth = new Tone.PolySynth(Tone.Synth).toDestination();
const pianoContainer = document.getElementById('piano');
const pianoNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Generate Piano Keys
for (let i = 0; i < 24; i++) {
    const n = pianoNotes[i % 12];
    const key = document.createElement('div');
    key.className = `key ${n.includes('#') ? 'black' : ''}`;
    key.dataset.note = `${n}${Math.floor(i/12) + 4}`;
    pianoContainer.appendChild(key);
}

// --- 3. CORE MUSIC LOGIC ---
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
                const chord = Tonal.Progression.fromRomanNumerals(keySig, [item])[0];
                res = Tonal.Chord.transpose(chord, interval);
            } else if (type === 'chord') {
                res = Tonal.Chord.transpose(item, interval);
            } else {
                res = Tonal.Note.transpose(item, interval);
            }
            if (accidental === 'sharp') res = Tonal.Note.simplify(res).replace(/b/g, '#');
            else if (accidental === 'flat') res = Tonal.Note.enharmonic(res);
            else res = Tonal.Note.simplify(res);
            return res;
        } catch (e) { return item; }
    });
    document.getElementById('resultText').innerText = transposedItems.join(" ");
    playMusic();
}

async function playMusic() {
    // Resume AudioContext on user gesture
    if (Tone.context.state !== 'running') await Tone.start();
    
    const type = document.getElementById('typeSelect').value;
    const text = document.getElementById('resultText').innerText;
    if (text === "--" || !text) return;

    const items = text.split(/\s+/);
    let now = Tone.now();
    
    items.forEach((item, index) => {
        let notesToPlay = (type === 'note') ? [item] : (Tonal.Chord.get(item).notes.length > 0 ? Tonal.Chord.get(item).notes : [item]);
        
        const formatted = notesToPlay.map(n => {
            let s = Tonal.Note.simplify(n);
            let fullNote = /\d/.test(s) ? s : s + "4";
            
            // Visual Highlight
            setTimeout(() => {
                const k = document.querySelector(`[data-note="${fullNote}"]`);
                if (k) {
                    k.classList.add('active');
                    setTimeout(() => k.classList.remove('active'), 400);
                }
            }, (now + (index * 0.5) - Tone.now()) * 1000);

            return fullNote;
        });
        synth.triggerAttackRelease(formatted, "4n", now + (index * 0.5));
    });
}

// --- 4. AUTH & LIBRARY LOGIC ---
let isSignUp = false;

function openAuth() { document.getElementById('authModal').style.display = 'flex'; }
function closeAuth() { document.getElementById('authModal').style.display = 'none'; }

function toggleAuthMode() {
    isSignUp = !isSignUp;
    document.getElementById('authTitle').innerText = isSignUp ? "Create Account" : "Sign In";
}

function handleAuth() {
    const email = document.getElementById('authEmail').value;
    const pass = document.getElementById('authPassword').value;
    if (isSignUp) {
        auth.createUserWithEmailAndPassword(email, pass).then(closeAuth).catch(err => alert(err.message));
    } else {
        auth.signInWithEmailAndPassword(email, pass).then(closeAuth).catch(err => alert(err.message));
    }
}

function logout() { auth.signOut(); }

auth.onAuthStateChanged(user => {
    const authBtn = document.getElementById('authBtn');
    const librarySection = document.getElementById('librarySection');
    const guestMsg = document.getElementById('guestMsg');

    if (user) {
        document.getElementById('userGreeting').innerText = `Hi, ${user.email.split('@')[0]}`;
        authBtn.innerText = "Logout";
        authBtn.onclick = logout;
        librarySection.style.display = 'block';
        guestMsg.style.display = 'none';
        displaySongs();
    } else {
        document.getElementById('userGreeting').innerText = "Guest Mode";
        authBtn.innerText = "Sign In";
        authBtn.onclick = openAuth;
        librarySection.style.display = 'none';
        guestMsg.style.display = 'block';
    }
});

// Cloud Sync Functions
async function saveSong() {
    const user = auth.currentUser;
    const title = document.getElementById('songTitle').value.trim();
    const data = document.getElementById('resultText').innerText;
    if (!user || !title || data === "--") return;

    try {
        await db.collection("users").doc(user.uid).collection("songs").add({
            title: title,
            data: data,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById('songTitle').value = "";
        displaySongs();
    } catch (e) { console.error("Error saving:", e); }
}

async function displaySongs() {
    const user = auth.currentUser;
    const list = document.getElementById('songsList');
    if (!user) return;

    const snapshot = await db.collection("users").doc(user.uid).collection("songs").orderBy("timestamp", "desc").get();
    list.innerHTML = snapshot.docs.map(doc => `
        <li>
            <span><strong>${doc.data().title}</strong>: ${doc.data().data}</span>
            <button onclick="deleteSong('${doc.id}')" style="background:none; border:none; color:#ff4444; cursor:pointer;">✕</button>
        </li>
    `).join('');
}

async function deleteSong(id) {
    const user = auth.currentUser;
    await db.collection("users").doc(user.uid).collection("songs").doc(id).delete();
    displaySongs();
}

function copyToClipboard() { navigator.clipboard.writeText(document.getElementById('resultText').innerText); }