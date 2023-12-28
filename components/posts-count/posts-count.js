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
        const handle = handleElement.value;
        const inputDate = inputDateElement.value;

        if (profile && profile.did) {
            let postsCounter = 0;
            const postsCounterFromLocalStorage = tryFindDataInLocalStorage(handle, inputDate);

            if (postsCounterFromLocalStorage > -1) {
                postsCounter = postsCounterFromLocalStorage;
            } else {
                let pageCounter = 0;
                let searchFinished = false;
                let cursor = undefined;

                const dataMap = new Map();

                while (!searchFinished) {
                    const response = await loadAuthorFeed(profile.did, token, cursor);
                    const posts = response.feed.map(feed => feed.post);

                    for (let i = 0; i < posts.length; i++) {
                        const postCreatedDate = posts[i].record.createdAt;

                        if (isInputDateBefore(inputDate, postCreatedDate) && dayIsFinished(postCreatedDate)) {
                            incrementCountForDate(dataMap, generateDateForSaving(postCreatedDate));
                        }

                        if (checkIfDatesMatch(inputDate, postCreatedDate) || posts[i].repostCount > 0) {
                            postsCounter++;
                        } else if (!isInputDateBefore(inputDate, postCreatedDate)) {
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

                if (dayIsFinished(inputDate)) {
                    dataMap.set(generateDateForSaving(inputDate), postsCounter);
                }

                saveMapToLocalStorage(handle, dataMap);
            }

            drawPostsCountTable(handle, inputDate, postsCounter);
        }
    } else {
        showInformationMessageInBlock('analyze-information-block', 'Відсутні необхідні дані для підрахунку', 'red');
    }

    hideAppSpinner();
    updateSpinnerLabel('');
}

function dayIsFinished(date) {
    const now = new Date();
    const givenDate = new Date(date);
    const timeDifference = now - givenDate;
    const daysDifference = timeDifference / (1000 * 60 * 60 * 24);

    return daysDifference >= 2 || now.getDay() - givenDate.getDay() === 2;
}

/**
 * Deserializes json string into Map<string, Map<string, number>>
 */
function deserializeDataMap(jsonString) {
    const deserializedData = JSON.parse(jsonString);
    const dataMap = new Map();

    for (let outerKey in deserializedData) {
        const innerMap = new Map();

        for (let innerKey in deserializedData[outerKey]) {
            innerMap.set(innerKey, deserializedData[outerKey][innerKey]);
        }

        dataMap.set(outerKey, innerMap);
    }

    return dataMap;
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

/**
 * Produces date as string in format 'yyyy-MM-dd'
 */
function generateDateForSaving(date) {
    const currentDate = new Date(date);
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/**
 * @param dataMap map with data
 * @param dateAsString date As Stirng in format yyyy-MM-dd
 */
function incrementCountForDate(dataMap, dateAsString) {
    if (dataMap.has(dateAsString)) {
        const currentCount = dataMap.get(dateAsString);

        dataMap.set(dateAsString, currentCount + 1);
    } else {
        dataMap.set(dateAsString, 1);
    }
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

function saveMapToLocalStorage(handle, dataMapToSave) {
    if (dataMapToSave && dataMapToSave.size > 0) {
        const actualDataMapAsJsonString = localStorage.getItem('postsCount-data');

        if (!actualDataMapAsJsonString) {
            let newHandleDataMap = new Map();

            newHandleDataMap.set(handle, dataMapToSave);

            localStorage.setItem('postsCount-data', serializeDataMap(newHandleDataMap));
        } else {
            let actualDataMap = deserializeDataMap(actualDataMapAsJsonString);

            if (!actualDataMap.has(handle)) {
                actualDataMap.set(handle, dataMapToSave);
            } else {
                for (let [key, value] of dataMapToSave.entries()) {
                    actualDataMap.get(handle).set(key, value);
                }
            }

            localStorage.setItem('postsCount-data', serializeDataMap(actualDataMap));
        }
    }
}

/**
 * Serializes Map<string, Map<string, number>> into json string
 */
function serializeDataMap(dataMap) {
    const serializedData = {};

    for (let [outerKey, innerMap] of dataMap.entries()) {
        const serializedInnerMap = {};

        for (let [innerKey, innerValue] of innerMap.entries()) {
            serializedInnerMap[innerKey] = innerValue;
        }

        serializedData[outerKey] = serializedInnerMap;
    }

    return JSON.stringify(serializedData);
}

function tryFindDataInLocalStorage(handle, date) {
    let postsCounter = -1;

    const postsCountDataString = localStorage.getItem('postsCount-data');
    if (postsCountDataString && postsCountDataString.length > 0) {
        const dataMap = deserializeDataMap(postsCountDataString);
        const preparedDate = generateDateForSaving(date);

        if (dataMap && dataMap.has(handle) && dataMap.get(handle).has(preparedDate)) {
            postsCounter = dataMap.get(handle).get(preparedDate);
        }
    }

    return postsCounter;
}
