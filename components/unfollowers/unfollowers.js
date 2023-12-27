async function analyze() {
    document.getElementById('analyze-spinner').style.display = 'flex';

    if (localStorage.getItem('handle') && localStorage.getItem('token')) {
        const profile = await loadProfile(localStorage.getItem('handle'), localStorage.getItem('token'));

        if (profile && profile.did) {
            const followers = await loadAllUsers('https://bsky.social/xrpc/app.bsky.graph.getFollowers?', profile.did, localStorage.getItem('token'));
            const following = await loadAllUsers('https://bsky.social/xrpc/app.bsky.graph.getFollows?', profile.did, localStorage.getItem('token'));

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
                `<td>${user.displayName}</td>
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

            const description = user.description ? user.description : '';

            tableRow.innerHTML =
                `<td><img src="${user.avatar}" alt="Avatar"></td>
                <td>${user.displayName}</td>
                <td>${description}</td>
                <td><a href="https://bsky.app/profile/${user.handle}" target="_blank" class="profile-link">@${user.handle}</a></td>`;

            tableBody.appendChild(tableRow);
            table.appendChild(tableBody);
        });
    }

    const tableBlock = document.getElementById('table-block');
    tableBlock.innerHTML = '';
    tableBlock.appendChild(table);
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
