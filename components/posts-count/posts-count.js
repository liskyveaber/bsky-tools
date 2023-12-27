// noinspection JSUnresolvedReference

function checkIfDatesMatch(inputDateAsString, actualDateAsString) {
    const inputDate = new Date(`${inputDateAsString}T00:00:00.000Z`);
    const actuaDate = new Date(actualDateAsString);

    return inputDate.toISOString().split('T')[0] === actuaDate.toISOString().split('T')[0];
}

async function countPosts() {
    showAppSpinner();
    updateSpinnerLabel("Відбувається пошук постів. \n Швидкість пошуку залежить від дати і об'єму стрічки");

    const inputDateElement = document.getElementById('posts-count-date-input');
    const handleElement = document.getElementById('posts-count-handle-input');
    const token = localStorage.getItem('token');

    if (handleElement && handleElement.value && inputDateElement && inputDateElement.value && token) {
        const profile = await loadProfile(handleElement.value, token);

        if (profile && profile.did) {
            let postsCounter = 0;
            let pageCounter = 0;
            let searchFinished = false;
            let cursor = undefined;

            while (!searchFinished) {
                const response = await loadAuthorFeed(profile.did, token, cursor);
                const posts = response.feed.map(feed => feed.post);

                for (let i = 0; i < posts.length; i++) {
                    if (checkIfDatesMatch(inputDateElement.value, posts[i].record.createdAt) || posts[i].repostCount > 0) {
                        postsCounter++;
                    } else if (isInputDateBefore(inputDateElement.value, posts[i].record.createdAt)) {

                    } else {
                        searchFinished = true;

                        break;
                    }
                }

                if (response.cursor) {
                    cursor = response.cursor;
                } else {
                    searchFinished = true;
                }

                updateSpinnerLabel('Оброблено ' + (pageCounter * 100 + postsCounter) + ' постів...');
                pageCounter++;
            }

            drawPostsCountTable(handleElement.value, inputDateElement.value, postsCounter);
        }
    } else {
        showInformationMessageInBlock('analyze-information-block', 'Відсутні необхідні дані для підрахунку', 'red');
    }

    hideAppSpinner();
    updateSpinnerLabel('');
}

function drawPostsCountTable(handle, date, postsCount) {
    const table = document.createElement('table');
    const tableHeader = document.createElement('thead');

    if (window.innerWidth <= 768) {
        // mobile device
        tableHeader.innerHTML = "<tr><th>Дата</th><th>Кількість постів</th></tr>";
        table.appendChild(tableHeader);

        const tableBody = document.createElement('tbody');
        const tableRow = document.createElement('tr');

        tableRow.innerHTML =
            `<td>${date}</td>
            <td>${postsCount}</td>`;

        tableBody.appendChild(tableRow);
        table.appendChild(tableBody);
    } else {
        // desktop
        tableHeader.innerHTML = "<tr><th>Дата</th><th>Нікнейм</th><th>Кількість постів</th></tr>";
        table.appendChild(tableHeader);

        const tableBody = document.createElement('tbody');
        const tableRow = document.createElement('tr');

        tableRow.innerHTML =
            `<td>${date}</td>
            <td><a href="https://bsky.app/profile/${handle}" target="_blank" class="profile-link">@${handle}</a></td>
            <td>${postsCount}</td>`;

        tableBody.appendChild(tableRow);
        table.appendChild(tableBody);
    }

    const tableBlock = document.getElementById('table-block');
    tableBlock.innerHTML = '';
    tableBlock.appendChild(table);
}

function isInputDateBefore(inputDateAsString, actualDateAsString) {
    let isInputDateBefore = false;

    const inputDate = new Date(`${inputDateAsString}T00:00:00.000Z`);
    const actuaDate = new Date(actualDateAsString);

    if (inputDate.getFullYear() < actuaDate.getFullYear()) {
        isInputDateBefore = true;
    } else if (inputDate.getFullYear() === actuaDate.getFullYear()) {
        if (inputDate.getMonth() < actuaDate.getMonth()) {
            isInputDateBefore = true;
        } else if (inputDate.getMonth() === actuaDate.getMonth()) {
            isInputDateBefore = inputDate.getDate() < actuaDate.getDate();
        }
    }

    return isInputDateBefore;
}

async function loadAuthorFeed(did, token, cursor) {
    const params = new URLSearchParams();
    params.append('actor', did);
    params.append('filter', 'posts_with_replies');
    params.append('limit', '100');

    if (cursor) {
        params.delete('timestamp');
        params.append('cursor', cursor);
    } else {
        params.append('timestamp', new Date().getTime().toString());
    }

    const response = await fetch('https://bsky.social/xrpc/app.bsky.feed.getAuthorFeed?' + params.toString(), {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    });

    return await response.json();
}
