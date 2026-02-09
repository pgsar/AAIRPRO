/**
 * AAIR® Exam Simulator - PRO VERSION 
 * Logic: Exam Mode (Feedback diffuso alla fine nel report)
 */

let currentQuestions = [];
let currentIdx = 0;
let score = 0;
let timerInterval;
let myChart = null;
let domainStats = {};
let missedQuestions = [];
let userAnswers = [];

// --- NAVIGAZIONE ---
function showSection(id) {
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function goToHome() {
    updateDashboard();
    showSection('home-section');
    clearInterval(timerInterval);
}

// --- LOGICA QUIZ (MODALITÀ ESAME) ---
function startNewQuiz(isReviewMode = false) {
    const selectElement = document.getElementById('question-count');
    const selection = selectElement.value;
    
    // Reset variabili sessione
    currentIdx = 0;
    score = 0;
    userAnswers = []; 
 domainStats = {
        "Domain 1: AI Governance": { correct: 0, total: 0 },
        "Domain 2: AI Risk Management": { correct: 0, total: 0 },
        "Domain 3: AI Lifecycle & Trustworthiness": { correct: 0, total: 0 },
    };
	

    if (isReviewMode) {
        // Usa le domande sbagliate salvate in precedenza
        currentQuestions = [...missedQuestions];
        missedQuestions = []; 
    } else {
        // Modalità normale: mescola il database
        missedQuestions = [];
        let numQuestions = selection === 'all' ? databaseDomande.length : parseInt(selection);
        let shuffled = [...databaseDomande].sort(() => 0.5 - Math.random());
        currentQuestions = shuffled.slice(0, numQuestions);
    }

    showSection('quiz-section');
    startTimer(currentQuestions.length * 1.5); // 1.5 minuti a domanda
    showQuestion();
}


function selectAnswerEnhanced(isCorrect, clickedBtn, allOptions) {
    const q = currentQuestions[currentIdx];
    const buttons = document.querySelectorAll('.option-btn');
    
    buttons.forEach(b => b.style.pointerEvents = 'none');

    // Salviamo il risultato per il report
    q.isCorrect = isCorrect;
    // Troviamo l'indice della risposta cliccata nell'ordine originale per il report (opzionale)
    q.userAnswerText = clickedBtn.innerText; 

    if (isCorrect) {
        clickedBtn.classList.add('correct');
        score++;
        updateDomainScore(q.domain, true);
    } else {
        clickedBtn.classList.add('error');
        // Evidenzia quella giusta tra i bottoni presenti
        buttons.forEach(b => {
            const match = allOptions.find(o => o.text === b.innerText);
            if(match && match.isCorrect) b.classList.add('correct');
        });
        missedQuestions.push(q);
        updateDomainScore(q.domain, false);
    }
    
    setTimeout(() => {
        currentIdx++;
        if (currentIdx < currentQuestions.length) {
            showQuestion();
        } else {
            finishQuiz();
        }
    }, 1000);
}

// Funzione di supporto per pulizia codice
function updateDomainScore(domainName, isCorrect) {
    let target = domainName;
    if (target === "Domain 4: AI Ecosystem & Compliance") target = "Domain 3: AI Lifecycle & Trustworthiness";
    if (domainStats[target]) {
        domainStats[target].total++;
        if (isCorrect) domainStats[target].correct++;
    }
}

function showQuestion() {
    const q = currentQuestions[currentIdx];
    const container = document.getElementById('options-container');
    const progressText = document.getElementById('progress-text');
    
    // Aggiorna il testo del progresso
    progressText.innerText = `Question ${currentIdx + 1} of ${currentQuestions.length}`;
    document.getElementById('question-text').innerText = q.question;
    
    // --- GESTIONE BARRA DI AVANZAMENTO ---
    // Usiamo currentIdx e currentQuestions (che sono i nomi che usi tu nel resto della funzione)
    const progressPercent = ((currentIdx + 1) / currentQuestions.length) * 100;
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.style.width = progressPercent + '%';
    }
    // -------------------------------------

    // 1. Creiamo un array di oggetti per "mappare" le opzioni originali
    let optionsMapped = q.options.map((opt, i) => {
        return { text: opt, isCorrect: (i === q.answer) };
    });

    // 2. Mescoliamo l'ordine delle opzioni
    optionsMapped.sort(() => Math.random() - 0.5);

    container.innerHTML = '';
    
    // 3. Generiamo i pulsanti con il nuovo ordine
    optionsMapped.forEach((optObj) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = optObj.text;
        
        // Passiamo al click se è quella corretta o meno
        btn.onclick = () => selectAnswerEnhanced(optObj.isCorrect, btn, optionsMapped);
        container.appendChild(btn);
    });
}

function selectAnswer(selectedIndex) {
    const q = currentQuestions[currentIdx];
    const buttons = document.querySelectorAll('.option-btn');
    
    // Disabilita click multipli
    buttons.forEach(b => b.style.pointerEvents = 'none');

    // Registra risposta
    q.userAnswer = selectedIndex;
    q.isCorrect = (selectedIndex === q.answer);

    // Feedback visivo rapido
    if (q.isCorrect) {
        buttons[selectedIndex].classList.add('correct');
        score++;
        if(domainStats[q.domain]) domainStats[q.domain].correct++;
    } else {
        buttons[selectedIndex].classList.add('error');
        buttons[q.answer].classList.add('correct'); // Mostra la giusta
        missedQuestions.push(q);
    }
    
    if(domainStats[q.domain]) domainStats[q.domain].total++;

    // Passa alla prossima dopo 1 secondo
    setTimeout(() => {
        currentIdx++;
        if (currentIdx < currentQuestions.length) {
            showQuestion();
        } else {
            finishQuiz();
        }
    }, 1000);
}

// --- FINE E REPORT ---
function finishQuiz() {
    clearInterval(timerInterval);
    const finalPerc = Math.round((score / currentQuestions.length) * 100);
    
    // Recupera lo storico
    let history = JSON.parse(localStorage.getItem('aair_progress')) || [];
    
    // Aggiorna il contatore totale di domande (per i Gradi/Ranks)
    let totalQ = parseInt(localStorage.getItem('aair_total_questions')) || 0;
    totalQ += currentQuestions.length;
    localStorage.setItem('aair_total_questions', totalQ);

    // Salva la sessione
    history.push({ 
        date: new Date().toLocaleDateString(), 
        score: finalPerc, 
        details: domainStats 
    });

    // Mantieni solo le ultime 15 sessioni e salva
    if(history.length > 15) history.shift();
    localStorage.setItem('aair_progress', JSON.stringify(history));
    localStorage.setItem('aair_missed_questions', JSON.stringify(missedQuestions));
    
    showReport(finalPerc);
}

function showReport(perc) {
    showSection('report-section');
    const container = document.getElementById('report-content');
    if(!container) return;

    // 1. Parte superiore: Risultato sintetico
    let html = `
        <div style="text-align:center; margin-bottom:20px;">
            <h2 style="font-size:1.8rem; margin-bottom:5px;">Quiz Finished!</h2>
            <div style="font-size:3rem; font-weight:bold; color:${perc >= 70 ? 'var(--correct)' : 'var(--error)'}">${perc}%</div>
            <p style="font-size:1.1rem; font-weight:bold;">
                ${perc >= 70 ? '🎉 EXAM PASSED!' : '❌ EXAM FAILED (Target 70%)'}
            </p>
        </div>
        <hr style="opacity:0.2; margin:20px 0;">
        <h3 style="margin-bottom:15px;">Review your answers:</h3>
    `;

    // 2. Ciclo per ricostruire il report dettagliato (Domanda per Domanda)
    currentQuestions.forEach((q, index) => {
        // Verifichiamo se l'utente ha sbagliato questa domanda
        const isMissed = missedQuestions.some(m => m.question === q.question);
        
       html += `
            <div style="margin-bottom: 25px; 
                        padding: 15px; 
                        border-radius: 10px; 
                        background: ${isMissed ? '#fff1f0' : '#f6ffed'}; 
                        border: 1px solid ${isMissed ? '#ffa39e' : '#b7eb8f'};
                        border-left: 6px solid ${isMissed ? '#dc3545' : '#28a745'};
                        page-break-inside: avoid; 
                        width: 95%; 
                        margin-left: auto; 
                        margin-right: auto;
                        display: block;
                        box-sizing: border-box;">
                
                <p style="font-weight:bold; margin-bottom:8px; color: #333;">Q${index + 1}: ${q.question}</p>
                
                <p style="font-size: 0.95rem; margin-bottom:10px;">
                    ${isMissed 
                        ? `<span style="color:#dc3545">❌ <b>Incorrect</b></span><br>
                           <span style="color:#28a745">✅ <b>Correct Choice:</b> ${q.options[q.answer]}</span>`
                        : `<span style="color:#28a745">✅ <b>Correct Answer!</b></span>`
                    }
                </p>

                ${q.explanation ? `
                    <div style="margin-top:10px; padding:12px; background: #ffffff; border-radius:8px; font-size:0.88rem; color:#444; border: 1px dashed #ccc;">
                        <strong>💡 Explanation:</strong> ${q.explanation}
                    </div>
                ` : ''}

                <div style="margin-top:8px; font-size:0.75rem; color:#777; font-style:italic;">
                    Domain: ${q.domain}
                </div>
            </div>
        `;
    });

// --- AGGIUNTA BOTTONI IN FONDO ---
html += `
        <div style="margin-top: 30px; display: flex; gap: 10px; flex-direction: column;">
            <button onclick="exportPDF(this)" class="btn-main" style="background: #1a73e8; color: white; border: none; padding: 15px; border-radius: 10px; font-weight: bold; cursor: pointer;">
                📄 DOWNLOAD PDF REPORT
            </button>
        </div>
    `;

    container.innerHTML = html;
}



// --- UTILITIES (Timer, PDF, Dashboard) ---

function startTimer(minutes) {
    let timeLeft = minutes * 60;
    const timerDisplay = document.getElementById('timer');
    clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        let mins = Math.floor(timeLeft / 60);
        let secs = timeLeft % 60;
        timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        if (--timeLeft < 0) { clearInterval(timerInterval); finishQuiz(); }
    }, 1000);
}

function exportPDF(btn) {
    const element = document.getElementById('report-content');
    if (!element) return;

    const originalText = btn.innerText;
    btn.innerText = "GENERATING...";
    btn.disabled = true;

    // Salvataggio stile per ripristino
    const originalStyle = element.getAttribute('style');
    
    // Setup forzato per la "foto" del PDF
    element.style.width = "750px"; 
    element.style.maxHeight = "none";
    element.style.overflow = "visible";
    element.style.background = "white";

    const opt = {
        margin: [15, 10, 15, 10],
        filename: 'Exam_Report.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true, 
            letterRendering: true,
            scrollY: 0 
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        // LOGICA DI SALTO PAGINA POTENZIATA
        pagebreak: { 
            mode: ['css', 'legacy'], 
            avoid: '.pdf-block', // MAI tagliare questi
            before: '.html2pdf__page-break' // Salta PRIMA di questi se necessario
        }
    };

    setTimeout(() => {
        html2pdf().from(element).set(opt).save().then(() => {
            element.setAttribute('style', originalStyle);
            btn.innerText = originalText;
            btn.disabled = false;
        }).catch(err => {
            console.error(err);
            element.setAttribute('style', originalStyle);
            btn.disabled = false;
        });
    }, 500);
}

// --- ANALYTICS & GRAFICO ---
function showProgress() {
    showSection('progress-section');
    
    const history = JSON.parse(localStorage.getItem('aair_progress')) || [];
    const totalQuestions = parseInt(localStorage.getItem('aair_total_questions')) || 0;
    const canvas = document.getElementById('performanceChart');
    
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (myChart) myChart.destroy();

    const officialDomains = [
        "Domain 1: AI Governance", 
        "Domain 2: AI Risk Management", 
        "Domain 3: AI Lifecycle & Trustworthiness"
    ];

    let dataPoints = [0, 0, 0];
    if (history.length > 0) {
        const lastSession = history[history.length - 1].details;
        dataPoints = officialDomains.map(d => {
            const stats = lastSession[d] || { correct: 0, total: 0 };
            return stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
        });
    }

    // CALCOLO RANK (Spostato qui per usarlo anche nel banner)
    let rank = "Novice";
    let color = "#666";
    if (totalQuestions > 500) { rank = "AI Master 🏆"; color = "#d4af37"; }
    else if (totalQuestions > 250) { rank = "Expert Specialist 🎓"; color = "#7209b7"; }
    else if (totalQuestions > 100) { rank = "Practitioner 🛠️"; color = "#3a86ff"; }
    else if (totalQuestions > 50) { rank = "Aspirant 🌟"; color = "#2ecc71"; }

    // AGGIORNAMENTO BANNER SUPERIORE
    const banner = document.getElementById('analytics-level-banner');
    if (banner) {
        banner.innerHTML = `
            <div style="background: ${color}; color: white; padding: 20px; border-radius: 15px; text-align: center; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <h3 style="margin:0; font-size:0.8rem; opacity:0.9; text-transform:uppercase; letter-spacing:1px;">Current Rank</h3>
                <div style="font-size:1.8rem; font-weight:900;">${rank}</div>
                <div style="font-size:0.9rem; margin-top:5px; opacity:0.9;">${totalQuestions} Questions Answered</div>
            </div>
        `;
    }

    // CREAZIONE GRAFICO (Con opzioni corrette per la centratura)
    myChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Governance', 'Risk Mgmt', 'Lifecycle'],
            datasets: [{
                label: 'Performance %',
                data: dataPoints,
                backgroundColor: 'rgba(220, 53, 69, 0.2)',
                borderColor: '#dc3545',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // POSIZIONE CORRETTA: dentro options
            scales: { 
                r: { 
                    beginAtZero: true, 
                    max: 100, 
                    min: 0, 
                    ticks: { display: false },
                    pointLabels: { font: { size: 11, weight: 'bold' } }
                } 
            },
            plugins: { legend: { display: false } }
        }
    });

    // BOX CONSIGLI AI
    const adviceBox = document.getElementById('ai-advice');
    if (adviceBox) {
        let statsHtml = `<h4 style="margin-top:0; color:#333;">💡 AI Study Advice</h4>`;
        if (history.length > 0) {
            const lowestValue = Math.min(...dataPoints);
            const lowDomainIdx = dataPoints.indexOf(lowestValue);
            statsHtml += `<p style="margin:0;">Your lowest score is in <u>${officialDomains[lowDomainIdx]}</u>. Keep practicing before the exam!.</p>`;
        } else {
            statsHtml += `<p style="margin:0;">Complete your first quiz to unlock your performance map!</p>`;
        }
        adviceBox.innerHTML = statsHtml;
    }
}
window.onload = updateDashboard;
// --- FUNZIONI DI SALVATAGGIO E DASHBOARD (Mancanti) ---

function saveProgress(perc) {
    let history = JSON.parse(localStorage.getItem('aair_progress')) || [];
    
    // Aggiorna il contatore domande totale (Lifetime)
    let totalQuestionsSoFar = parseInt(localStorage.getItem('aair_total_questions')) || 0;
    totalQuestionsSoFar += currentQuestions.length;
    localStorage.setItem('aair_total_questions', totalQuestionsSoFar);

    const sessionData = { 
        date: new Date().toLocaleDateString(), 
        score: perc,
        details: domainStats 
    };
    
    history.push(sessionData);
    if(history.length > 15) history.shift(); 
    localStorage.setItem('aair_progress', JSON.stringify(history));
    updateDashboard();
}
function updateDashboard() {
    let history = JSON.parse(localStorage.getItem('aair_progress')) || [];
    
    const statAvg = document.getElementById('stat-avg');
    const statSessions = document.getElementById('stat-sessions');

    if(history.length > 0) {
        // Calcola la media dei punteggi
        let avg = Math.round(history.reduce((a, b) => a + b.score, 0) / history.length);
        
        // Aggiorna l'HTML se gli elementi esistono
        if(statAvg) statAvg.innerText = avg + "%";
        if(statSessions) statSessions.innerText = history.length;
    } else {
        if(statAvg) statAvg.innerText = "0%";
        if(statSessions) statSessions.innerText = "0";
    }
}
document.addEventListener('ionBackButton', (ev) => {
  ev.detail.register(10, () => {
    const currentSection = document.querySelector('section.active').id;
    if (currentSection !== 'home-section') {
      goToHome();
    } else {
      navigator.app.exitApp(); // Chiude l'app solo se sei in Home
    }
  });
});

/* --- LOGICA PER IL TEMA SCURO --- */
function toggleTheme() {
    const body = document.body;
    const themeBtn = document.getElementById('theme-toggle');
    
    body.classList.toggle('dark-mode');
    
    const isDark = body.classList.contains('dark-mode');
    
    if (isDark) {
        if (themeBtn) themeBtn.innerHTML = '☀️';
        localStorage.setItem('theme', 'dark');
    } else {
        if (themeBtn) themeBtn.innerHTML = '🌙';
        localStorage.setItem('theme', 'light');
    }
}

// Caricamento tema all'avvio
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const themeBtn = document.getElementById('theme-toggle');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeBtn) themeBtn.innerHTML = '☀️';
    } else {
        if (themeBtn) themeBtn.innerHTML = '🌙';
    }
}); // <--- QUI MANCAVA LA CHIUSURA CORRETTA

function clearAllHistory() {
    if (confirm("⚠️ DELETE EVERYTHING?\nThis will reset scores, charts, and the lifetime counter.")) {
        localStorage.removeItem('aair_progress');
        localStorage.removeItem('aair_total_questions');
        localStorage.removeItem('aair_missed_questions');
        alert("Reset Complete!");
        window.location.reload();
    }
}

function confirmExit() {
    if (confirm("⚠️ EXIT SIMULATION?\nYour current progress will be lost.")) {
        clearInterval(timerInterval);
        goToHome();
    }
}

function renderQuestion() {
    const q = currentQuestions[currentIdx];
    
    // Aggiorna Testo Progresso e Barra
    const progText = document.getElementById('progress-text');
    const progBar = document.getElementById('progress-bar');
    if(progText) progText.innerText = `Question ${currentIdx + 1} of ${currentQuestions.length}`;
    if(progBar) progBar.style.width = ((currentIdx / currentQuestions.length) * 100) + "%";

    // Aggiorna Testo Domanda
    const qText = document.getElementById('question-text');
    if(qText) qText.innerText = q.question;

    // Svuota e rigenera i bottoni delle opzioni
    const container = document.getElementById('options-container');
    if(container) {
        container.innerHTML = '';
        q.options.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerText = opt;
            btn.onclick = () => handleAnswer(i);
            container.appendChild(btn);
        });
    }
}

function handleAnswer(selectedIdx) {
    const q = currentQuestions[currentIdx];
    const isCorrect = selectedIdx === q.correct;

    // Effetto bagliore sulla barra di progresso
    const progressBar = document.getElementById('progress-bar');
    if(progressBar) {
        progressBar.classList.add('progress-active');
        setTimeout(() => progressBar.classList.remove('progress-active'), 400);
    }
    // Salviamo la risposta data per il report
    userAnswers.push({
        questionIdx: currentIdx,
        selected: selectedIdx,
        correct: q.correct,
        isCorrect: isCorrect
    });

    // Registra statistiche per il grafico Radar
    if (!domainStats[q.domain]) domainStats[q.domain] = { correct: 0, total: 0 };
    domainStats[q.domain].total++;

    if (isCorrect) {
        score++;
        domainStats[q.domain].correct++;
    } else {
        missedQuestions.push(q); // Salva per Review Mode
    }

    currentIdx++;
    if (currentIdx < currentQuestions.length) {
        renderQuestion();
    } else {
        finishQuiz();
    }
}