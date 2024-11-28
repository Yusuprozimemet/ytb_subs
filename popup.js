document.addEventListener('DOMContentLoaded', () => {
    const audioElement = document.getElementById('audio');
    const subtitlesDiv = document.getElementById('subtitles');
    const playButton = document.getElementById('playButton');
    const saveButton = document.getElementById('saveButton');
    const fileInfoDiv = document.getElementById('fileInfo');
    let subtitles = [];
    let audioFile, srtFile;

    // Enhanced file selection and display
    ['audioFile', 'srtFile'].forEach(fileInputId => {
        document.getElementById(fileInputId).addEventListener('change', (e) => {
            const file = e.target.files[0];
            const label = e.target.labels[0];
            if (file) {
                label.innerHTML = `<i class="bi bi-check-circle-fill"></i> ${file.name}`;
                label.style.backgroundColor = 'var(--accent-color)';
            }
        });
    });

    saveButton.addEventListener('click', () => {
        audioFile = document.getElementById('audioFile').files[0];
        srtFile = document.getElementById('srtFile').files[0];

        if (!audioFile || !srtFile) {
            subtitlesDiv.innerHTML = '<p style="color:red;">Please upload both audio and subtitle files!</p>';
            return;
        }

        const audioURL = URL.createObjectURL(audioFile);
        audioElement.src = audioURL;

        const reader = new FileReader();
        reader.onload = (event) => {
            const srtText = event.target.result;
            subtitles = parseSRT(srtText);

            // Store subtitles and file information
            localStorage.setItem('subtitles', JSON.stringify(subtitles));
            localStorage.setItem('audioFile', audioFile.name);
            localStorage.setItem('srtFile', srtFile.name);

            fileInfoDiv.innerHTML = `
                <i class="bi bi-file-music"></i> Audio: ${audioFile.name}<br>
                <i class="bi bi-file-text"></i> Subtitles: ${srtFile.name}
            `;

            subtitlesDiv.innerHTML = '<p style="color:green;">Files saved successfully!</p>';
        };
        reader.readAsText(srtFile);
    });

    playButton.addEventListener('click', () => {
        // Retrieve saved subtitles from localStorage
        const savedSubtitles = localStorage.getItem('subtitles');

        if (!savedSubtitles) {
            subtitlesDiv.innerHTML = '<p style="color:red;">No files saved. Please upload and save files first.</p>';
            return;
        }

        // Parse the saved subtitles
        subtitles = JSON.parse(savedSubtitles);

        // Remove any existing event listeners to prevent multiple additions
        audioElement.removeEventListener('timeupdate', handleSubtitleSync);

        // Add event listener for subtitle synchronization
        audioElement.addEventListener('timeupdate', handleSubtitleSync);

        // Play the audio
        audioElement.play();
    });

    function handleSubtitleSync() {
        const currentTime = audioElement.currentTime;

        // Find the current subtitle
        const currentSubtitle = subtitles.find(subtitle =>
            currentTime >= subtitle.start && currentTime <= subtitle.end
        );

        // Update subtitle display
        if (currentSubtitle) {
            subtitlesDiv.textContent = currentSubtitle.text;
            subtitlesDiv.style.opacity = '1';
        } else {
            subtitlesDiv.textContent = '';
            subtitlesDiv.style.opacity = '0.5';
        }
    }

    function parseSRT(srtText) {
        const lines = srtText.split('\n');
        const subtitles = [];
        let currentSubtitle = {};

        lines.forEach((line, index) => {
            // Skip empty lines
            if (line.trim() === '') return;

            // Check if line is a time code
            if (line.includes('-->')) {
                const [startTime, endTime] = line.split('-->').map(time => time.trim());
                currentSubtitle.start = timeStringToSeconds(startTime);
                currentSubtitle.end = timeStringToSeconds(endTime);
            }
            // Check if line is a subtitle text (not an index)
            else if (isNaN(line.trim())) {
                // Accumulate multi-line subtitles
                if (currentSubtitle.text) {
                    currentSubtitle.text += ' ' + line.trim();
                } else {
                    currentSubtitle.text = line.trim();
                }

                // If this is the last line or next line is empty, push the subtitle
                if (index === lines.length - 1 || lines[index + 1].trim() === '') {
                    if (Object.keys(currentSubtitle).length > 1) {
                        subtitles.push(currentSubtitle);
                    }
                    currentSubtitle = {};
                }
            }
        });

        return subtitles;
    }

    function timeStringToSeconds(timeString) {
        // Handle cases with missing hours or milliseconds
        const parts = timeString.split(':');
        let hours = 0, minutes = 0, seconds = 0;

        if (parts.length === 3) {
            [hours, minutes, seconds] = parts.map(parseFloat);
        } else if (parts.length === 2) {
            [minutes, seconds] = parts.map(parseFloat);
        }

        // Handle milliseconds
        if (seconds.toString().includes(',')) {
            seconds = parseFloat(seconds.toString().replace(',', '.'));
        }

        return hours * 3600 + minutes * 60 + seconds;
    }
});