document.addEventListener('DOMContentLoaded', function () {
    if (localStorage.getItem('handle') && document.getElementById('handle')) {
        document.getElementById('handle').value = localStorage.getItem('handle');
    }

    if (localStorage.getItem('appPassword') && document.getElementById('appPassword')) {
        document.getElementById('appPassword').value = localStorage.getItem('appPassword');
    }
});

async function analyze() {
    document.getElementById('analyze-spinner').style.display = 'flex';

    const handle = localStorage.getItem('handle');
    const token = localStorage.getItem('token');

    if (handle && token) {
        const profile = await loadProfile(handle, token);

        if (profile && profile.did) {
            const getFollowersUrl = 'https://bsky.social/xrpc/app.bsky.graph.getFollowers?';
            const followers = await loadAllUsers(getFollowersUrl, profile.did, token);

            const getFollowingUrl = 'https://bsky.social/xrpc/app.bsky.graph.getFollows?';
            const following = await loadAllUsers(getFollowingUrl, profile.did, token);

            const unfollowers = findUnfollowers(followers, following);

            drawUnfollowersTable(unfollowers);
        }
    } else {
        showInformationMessageInBlock('analyze-information-block', 'Відсутні необхідні дані для автентифікації. Спробуйте започаткувати сесію ще раз', 'red');
    }

    document.getElementById('analyze-spinner').style.display = 'none';
}

function drawUnfollowersTable(unfollowers) {
    const table = document.createElement('table');
    const tableHeader = document.createElement('thead');

    if (window.innerWidth <= 768) {
        // mobile device
        tableHeader.innerHTML = "<tr><th>Ім'я</th><th>Дороговказ</th></tr>";
        table.appendChild(tableHeader);

        const tableBody = document.createElement('tbody');
        unfollowers.forEach(user => {
            const tableRow = document.createElement('tr');

            tableRow.innerHTML =
                `<td class="td-name">${user.displayName}</td>
                <td><a href="https://bsky.app/profile/${user.handle}" target="_blank" class="profile-link">@${user.handle}</a></td>`;

            tableBody.appendChild(tableRow);
            table.appendChild(tableBody);
        });
    } else {
        // desktop
        tableHeader.innerHTML = "<tr><th>Аватар</th><th>Ім'я</th><th>Опис</th><th>Дороговказ</th></tr>";
        table.appendChild(tableHeader);

        const tableBody = document.createElement('tbody');
        unfollowers.forEach(user => {
            const tableRow = document.createElement('tr');

            tableRow.innerHTML =
                `<td><img src="${user.avatar}" alt="Avatar"></td>
                <td class="td-name">${user.displayName}</td>
                <td>${user.description}</td>
                <td><a href="https://bsky.app/profile/${user.handle}" target="_blank" class="profile-link">@${user.handle}</a></td>`;

            tableBody.appendChild(tableRow);
            table.appendChild(tableBody);
        });
    }

    const analyzeInformationBlock = document.getElementById('table-block');
    analyzeInformationBlock.innerHTML = '';
    analyzeInformationBlock.appendChild(table);
}

function initializeSession() {
    document.getElementById('initialize-spinner').style.display = 'flex';

    var handleValue = document.getElementById('handle').value;
    var appPasswordValue = document.getElementById('appPassword').value;

    if (handleValue && appPasswordValue) {
        var requestBody = JSON.stringify({
            "identifier": handleValue,
            "password": appPasswordValue
        });

        fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: requestBody
        })
            .then(response => response.json())
            .then(data => {
                if (!data.error) {
                    localStorage.setItem('handle', handleValue);
                    localStorage.setItem('appPassword', appPasswordValue);
                    localStorage.setItem('token', data.accessJwt);

                    showMessageInBlock('session-information-block', 'Сесію успішно започатковано!', 'green');

                    document.getElementById('analyze-button-block').style.display = 'flex';
                } else if (data.error && data.message) {
                    showMessageInBlock('session-information-block', 'Не вдалось отримати дані для автентифікації. Помилка: ' + data.message, 'red');
                }
            })
            .catch(error => {
                console.error('Error during session initialization:', error);
            });
    } else {
        showMessageInBlock('session-information-block', 'Необхідні для автентикації дані відсутні', 'red');
    }

    document.getElementById('initialize-spinner').style.display = 'none';
}

function findUnfollowers(followers, following) {
    const followersMap = new Map();
    const followingMap = new Map();

    followers.forEach(follower => followersMap.set(follower.did, true));
    following.forEach(following => followingMap.set(following.did, true));

    return following.filter(obj => !followersMap.has(obj.did));
}

async function loadAllUsers(url, did, token) {
    var userList = [];

    const params = new URLSearchParams();
    params.append('actor', did);
    params.append('limit', 100);

    var response = await loadUsers(url, params, token);

    if (url.includes('getFollowers')) {
        if (response && response.followers) {
            userList = response.followers;
        }
    } else if (url.includes('getFollows')) {
        if (response && response.follows) {
            userList = response.follows;
        }
    }

    while (response.cursor) {
        if (params.has('cursor')) {
            params.set('cursor', response.cursor);
        } else {
            params.append('cursor', response.cursor);
        }

        response = await loadUsers(url, params, token);

        if (url.includes('getFollowers')) {
            if (response && response.followers) {
                userList = userList.concat(response.followers);
            }
        } else if (url.includes('getFollows')) {
            if (response && response.follows) {
                userList = userList.concat(response.follows);
            }
        }
    }

    return userList;
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

async function loadUsers(url, params, token) {
    const response = await fetch(url + params.toString(), {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    });

    const data = await response.json();

    return data;
}

function showMessageInBlock(id, message, color) {
    const block = document.getElementById(id);
    block.textContent = message;
    block.style.color = color;
    block.style.display = 'flex';

    setTimeout(function () {
        block.style.display = 'none';
        block.textContent = '';
    }, 3000);
}
