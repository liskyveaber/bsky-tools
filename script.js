document.addEventListener('DOMContentLoaded', function () {
    if (localStorage.getItem('reloadTime')) {
        const reloadTimestamp = localStorage.getItem('reloadTime');
        const reloadTime = new Date(reloadTimestamp);
        const now = new Date();
        const timeDifference = now - reloadTime;
        const isGreaterThan24Hours = timeDifference > 24 * 60 * 60 * 1000;

        if (isGreaterThan24Hours) {
            localStorage.setItem('reloadTime', now.getTime());
            location.reload(true);
        }
    } else {
        localStorage.setItem('reloadTime', new Date().getTime());
    }
});

function loadUnfollowersPage() {
    const timestamp = new Date().getTime();

    fetch('https://liskyveaber.github.io/bsky-tools/components/unfollowers/unfollowers' + '?timestamp=' + timestamp, {
        method: 'GET',
        headers: {
            'Accept': 'text/html'
        }
    })
        .then(response => response.text())
        .then(html => {
            document.getElementById('grid-container').style.display = 'none';
            document.getElementById('content-container').innerHTML = html;

            if (localStorage.getItem('handle') && document.getElementById('handle')) {
                document.getElementById('handle').value = localStorage.getItem('handle');
            }

            if (localStorage.getItem('appPassword') && document.getElementById('appPassword')) {
                document.getElementById('appPassword').value = localStorage.getItem('appPassword');
            }
        })
        .catch(error => console.error('Error while loading content:', error));
}

function navigateToHome() {
    var homeUrl = 'https://liskyveaber.github.io/bsky-tools';
    var timestamp = new Date().getTime();
    var urlWithTimestamp = homeUrl + '?timestamp=' + timestamp;

    window.location.href = urlWithTimestamp;
}
