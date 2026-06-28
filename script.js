document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const hoursDisplay = document.getElementById('hours');
    const minutesDisplay = document.getElementById('minutes');
    const secondsDisplay = document.getElementById('seconds');
    const millisecondsDisplay = document.getElementById('milliseconds');
    const startStopBtn = document.getElementById('start-stop-btn');
    const lapResetBtn = document.getElementById('lap-reset-btn');
    const lapsList = document.getElementById('laps-list');
    const emptyMsg = document.getElementById('empty-laps-msg');
    
    // SVG Circle setup
    const circle = document.getElementById('progress-ring');
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = circumference;

    // Ticks Rendering
    const tickContainer = document.querySelector('.ticks');
    for (let i = 0; i < 60; i++) {
        const tick = document.createElement('div');
        tick.className = 'tick';
        tick.style.transform = `rotate(${i * 6}deg)`;
        if (i % 5 === 0) { 
            tick.classList.add('major');
        }
        tickContainer.appendChild(tick);
    }

    // --- State Variables ---
    let startTime = 0;
    let elapsedTime = 0;
    let isRunning = false;
    let laps = [];
    let animationFrameId = null;

    // CORE LOGIC: Formatting & Time Math
    function formatTime(timeInMs) {
        const totalMilliseconds = Math.floor(timeInMs);

        const h = Math.floor(totalMilliseconds / 3600000);
        const m = Math.floor((totalMilliseconds % 3600000) / 60000);
        const s = Math.floor((totalMilliseconds % 60000) / 1000);
        const ms = Math.floor((totalMilliseconds % 1000) / 10);
        
        return { 
            hours: String(h).padStart(2, '0'),
            minutes: String(m).padStart(2, '0'), 
            seconds: String(s).padStart(2, '0'), 
            milliseconds: String(ms).padStart(2, '0') 
        };
    }

    function updateTitle(timeFormatted, status) {
        if (status === 'reset') {
            document.title = 'Stopwatch';
        } else if (status === 'running') {
            document.title = `▶ Stopwatch (${timeFormatted.hours}:${timeFormatted.minutes}:${timeFormatted.seconds})`;
        } else {
            document.title = `⏸ Stopwatch (${timeFormatted.hours}:${timeFormatted.minutes}:${timeFormatted.seconds})`;
        }
    }

    function updateDisplay(timeInMs) {
        const formatted = formatTime(timeInMs);
        hoursDisplay.textContent = formatted.hours;
        minutesDisplay.textContent = formatted.minutes;
        secondsDisplay.textContent = formatted.seconds;
        millisecondsDisplay.textContent = formatted.milliseconds;
        const totalHours = (timeInMs / 3600000) % 1; 
        const offset = circumference - totalHours * circumference;
        circle.style.strokeDashoffset = offset;
    }

    function updateTimer() {
        elapsedTime = performance.now() - startTime;
        updateDisplay(elapsedTime);
        
        if (elapsedTime % 1000 < 20) {
            updateTitle(formatTime(elapsedTime), 'running');
        }
        
        animationFrameId = requestAnimationFrame(updateTimer);
    }

    // CONTROLS: Start, Stop, Reset, Lap

    function toggleStartStop() {
        circle.classList.remove('reset-anim');

        if (isRunning) {
            cancelAnimationFrame(animationFrameId);
            isRunning = false;
            startStopBtn.textContent = 'Start';
            startStopBtn.classList.remove('running');
            startStopBtn.setAttribute('aria-label', 'Start Stopwatch');
            lapResetBtn.textContent = 'Reset'; 
            
            updateTitle(formatTime(elapsedTime), 'paused');
        } else {
            startTime = performance.now() - elapsedTime;
            animationFrameId = requestAnimationFrame(updateTimer);
            isRunning = true;
            startStopBtn.textContent = 'Stop';
            startStopBtn.classList.add('running');
            startStopBtn.setAttribute('aria-label', 'Stop Stopwatch');
            lapResetBtn.textContent = 'Lap'; 
            lapResetBtn.disabled = false;
        }
    }

    function handleLapReset() {
        if (!isRunning) {
            elapsedTime = 0;
            laps = [];
            circle.classList.add('reset-anim');
            circle.style.strokeDashoffset = circumference;
            
            updateDisplay(0);
            updateTitle(null, 'reset');
            
            lapsList.innerHTML = '';
            emptyMsg.style.display = 'block';
            lapResetBtn.textContent = 'Lap';
            lapResetBtn.disabled = true;
        } else {
            recordLap();
        }
    }

    // LAP LOGIC: Tracking, Rendering, and Highlighting

    function recordLap() {
        const currentTotalTime = elapsedTime;
        const previousTotalTime = laps.length > 0 ? laps[0].overallMs : 0;
        const lapTimeMs = currentTotalTime - previousTotalTime;

        const lapData = {
            lapNumber: laps.length + 1,
            lapMs: lapTimeMs,
            overallMs: currentTotalTime
        };
        
        laps.unshift(lapData);
        renderLaps();
    }

    function renderLaps() {
        if (laps.length > 0) {
            emptyMsg.style.display = 'none';
        }
        
        lapsList.innerHTML = ''; 

        let fastestLapIdx = -1;
        let slowestLapIdx = -1;

        if (laps.length > 1) {
            let minTime = Infinity;
            let maxTime = 0;

            laps.forEach((lap, index) => {
                if (lap.lapMs < minTime) { 
                    minTime = lap.lapMs; 
                    fastestLapIdx = index; 
                }
                if (lap.lapMs > maxTime) { 
                    maxTime = lap.lapMs; 
                    slowestLapIdx = index; 
                }
            });
        }

        laps.forEach((lap, index) => {
            const li = document.createElement('li');
            li.className = 'lap-item';

            if (index === fastestLapIdx) li.classList.add('fastest');
            if (index === slowestLapIdx) li.classList.add('slowest');

            const lapTime = formatTime(lap.lapMs);
            const overallTime = formatTime(lap.overallMs);

            li.innerHTML = `
                <span>${String(lap.lapNumber).padStart(2, '0')}</span>
                <span>${lapTime.hours === '00' ? '' : lapTime.hours + ':'}${lapTime.minutes}:${lapTime.seconds}.${lapTime.milliseconds}</span>
                <span>${overallTime.hours === '00' ? '' : overallTime.hours + ':'}${overallTime.minutes}:${overallTime.seconds}.${overallTime.milliseconds}</span>
            `;

            lapsList.appendChild(li);
        });
    }

    // EVENT LISTENERS

    startStopBtn.addEventListener('click', toggleStartStop);
    lapResetBtn.addEventListener('click', handleLapReset);

    document.addEventListener('keydown', (e) => {
        const activeElement = document.activeElement.tagName;
        if (activeElement === 'INPUT' || activeElement === 'TEXTAREA') return;

        if (e.code === 'Space') {
            e.preventDefault();
            toggleStartStop();
        }
        if (e.code === 'Enter') {
            e.preventDefault();
            if (!lapResetBtn.disabled) {
                handleLapReset();
            }
        }
    });
});