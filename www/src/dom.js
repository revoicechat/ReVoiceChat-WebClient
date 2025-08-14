function createListItem(child) {
    const LI = document.createElement('li');
    LI.appendChild(child);
    return LI
}

function createAnchor(html, onclick, id) {
    const ANCHOR = document.createElement('a');
    ANCHOR.className = "w3-bar-item w3-button";
    ANCHOR.href = "#";
    ANCHOR.innerHTML = html;
    ANCHOR.onclick = onclick;
    ANCHOR.target = "_self";
    ANCHOR.id = id;
    return ANCHOR;
}