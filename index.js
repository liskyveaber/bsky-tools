document.addEventListener('DOMContentLoaded', function () {
    if (localStorage.getItem('reloadTime')) {
        const reloadTime = new Date(localStorage.getItem('reloadTime'));
        const timeDifference = new Date() - reloadTime;
        const isGreaterThan24Hours = timeDifference > 24 * 60 * 60 * 1000;

        if (isGreaterThan24Hours) {
            localStorage.setItem('reloadTime', now.getTime());
            location.reload(true);
        }
    } else {
        localStorage.setItem('reloadTime', new Date().getTime());
    }

    // cleanup local storage from no longer used entries
    if (localStorage.getItem('accessToken')) {
        localStorage.removeItem('accessToken');
    }

    if (localStorage.getItem('appPassword')) {
        localStorage.removeItem('appPassword');
    }
});

function displayAnalyzeBlock(sessionInitialized) {
    if (sessionInitialized) {
        document.getElementById('analyze-block').style.display = 'flex';
    }
}

function hideAppSpinner() {
    document.getElementById('app-spinner-overlay').style.display = 'none';
}

async function initializeSession(handle, password, showErrors) {
    return new Promise(async (resolve, reject) => {
        var sessionInitialized = false;

        if (handle && password) {
            const requestBody = JSON.stringify({
                "identifier": handle,
                "password": password
            });

            await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: requestBody
            })
                .then(response => response.json())
                .then(data => {
                    if (!data.error) {
                        localStorage.setItem('handle', handle);
                        localStorage.setItem('password', password);
                        localStorage.setItem('token', data.accessJwt);

                        sessionInitialized = true;
                    } else if (data.error && data.message) {
                        showMessageInBlock('session-information-block', 'Не вдалось отримати дані для автентифікації. Помилка: ' + data.message, 'red', showErrors);
                    }
                })
                .catch(error => showMessageInBlock('session-information-block', 'Сталась неочікувана помилка під час автентифікації. Помилка: ' + error.message, 'red', showErrors));

        } else {
            showMessageInBlock('session-information-block', 'Необхідні для автентикації дані відсутні', 'red', showErrors);
        }

        resolve(sessionInitialized);
    });
}

async function initializeSessionManually() {
    if (document.getElementById('handle') && document.getElementById('password')) {
        const sessionInitialized = await initializeSession(document.getElementById('handle').value, document.getElementById('password').value, true);

        setupSessionForm(sessionInitialized);
        populatePreviouslyUsedValuesForSessionForm(sessionInitialized);
        displayAnalyzeBlock(sessionInitialized);
    } else {
        showMessageInBlock('session-information-block', 'Необхідні для автентикації дані відсутні', 'red', showErrors);
    }
}

async function loadProfile(handle, token) {
    const params = new URLSearchParams();
    params.append('actor', handle);

    const response = await fetch('https://bsky.social/xrpc/app.bsky.actor.getProfile?' + params.toString(), {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    });

    const data = await response.json();

    return data;
}

async function loadUnfollowersPage() {
    showAppSpinner();

    const sessionInitialized = await initializeSession(localStorage.getItem('handle'), localStorage.getItem('password'), false);

    fetch('https://liskyveaber.github.io/bsky-tools/components/unfollowers/unfollowers' + '?timestamp=' + new Date().getTime(), {
        method: 'GET',
        headers: {
            'Accept': 'text/html'
        }
    })
        .then(response => response.text())
        .then(html => {
            document.getElementById('grid-container').style.display = 'none';
            document.getElementById('content-container').innerHTML = html;

            setupSessionForm(sessionInitialized);
            populatePreviouslyUsedValuesForSessionForm(sessionInitialized);
            displayAnalyzeBlock(sessionInitialized);
            hideAppSpinner();
        })
        .catch(error => {
            console.error('Error while loading content:', error)

            hideAppSpinner();
            navigateToHome();
        });
}

async function loadPostCountPage() {
    showAppSpinner();

    const sessionInitialized = await initializeSession(localStorage.getItem('handle'), localStorage.getItem('password'), false);

    fetch('https://liskyveaber.github.io/bsky-tools/components/posts-count/posts-count' + '?timestamp=' + new Date().getTime(), {
        method: 'GET',
        headers: {
            'Accept': 'text/html'
        }
    })
        .then(response => response.text())
        .then(html => {
            document.getElementById('grid-container').style.display = 'none';
            document.getElementById('content-container').innerHTML = html;

            setupSessionForm(sessionInitialized);
            populatePreviouslyUsedValuesForSessionForm(sessionInitialized);
            populateDefaultValuesForPostsCountForm('posts-count-handle-input', 'posts-count-date-input');
            hideAppSpinner();
        })
        .catch(error => {
            console.error('Error while loading content:', error)

            hideAppSpinner();
            navigateToHome();
        });
}

function navigateToHome() {
    showAppSpinner();

    const homeUrl = 'https://liskyveaber.github.io/bsky-tools?timestamp=' + new Date().getTime();

    window.location.href = homeUrl;

    hideAppSpinner();
}

function populateDefaultValuesForPostsCountForm(handleElementId, dateElementId) {
    const handleElement = document.getElementById(handleElementId);

    if (handleElement && localStorage.getItem('handle')) {
        handleElement.value = localStorage.getItem('handle');
    }

    const dateElement = document.getElementById(dateElementId);

    if (dateElement) {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const day = currentDate.getDate().toString().padStart(2, '0');

        dateElement.value = `${year}-${month}-${day}`;
    }
}

function populatePreviouslyUsedValuesForSessionForm(sessionInitialized) {
    if (!sessionInitialized) {
        if (localStorage.getItem('handle') && document.getElementById('handle')) {
            document.getElementById('handle').value = localStorage.getItem('handle');
        }

        if (localStorage.getItem('password') && document.getElementById('password')) {
            document.getElementById('password').value = localStorage.getItem('password');
        }
    }
}

function setupSessionForm(sessionInitialized) {
    if (!sessionInitialized) {
        document.getElementById('credentialsForm').style.display = 'flex';
    } else {
        document.getElementById('credentialsForm').style.display = 'none';
    }
}

function showAppSpinner() {
    document.getElementById('app-spinner-overlay').style.display = 'flex';
}

function showMessageInBlock(id, message, color, showErrors) {
    if (showErrors) {
        const block = document.getElementById(id);

        if (block) {
            block.textContent = message;
            block.style.color = color;
            block.style.display = 'flex';

            setTimeout(function () {
                block.style.display = 'none';
                block.textContent = '';
            }, 3000);
        }
    }
}

function updateSpinnerLabel(labelToSet) {
    const spinnerLabelElement = document.getElementById("spinner-label");

    spinnerLabelElement.textContent = labelToSet;
}
