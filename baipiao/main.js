"use strict";

const api_root = 'https://api.tuwan.com';
// const api_root = 'http://localhost:8080';

function set_color_scheme() {
    document.getElementById('meta-color-scheme').content = document.getElementById('color-scheme-select').value;
}

function clicky_log_wrapper(...args) {
    if (typeof clicky == 'undefined') {
        console.log('clicky not loaded');
        return;
    }
    clicky.log(...args);
}

function hash_to_album_id() {
    const album_id = parseInt(window.location.hash.substring(1));
    if (isNaN(album_id)) {
        return null;
    }
    return album_id;
}

function onhashchange(event) {
    const album_id = hash_to_album_id();
    document.getElementById('album-id').value = album_id;
    const album_script_element = document.getElementById('album-script');
    if (album_script_element && album_id) {
        if (album_script_element.getAttribute('data-queried-album-id') === album_id.toString()) {
            console.log('onhashchange skipping album load because new album id == queried album id');
            return;
        }
        if (album_script_element.getAttribute('data-loaded-album-id') === album_id.toString()) {
            console.log('onhashchange skipping album load because new album id == loaded album id');
            return;
        }
    }
    console.log('onhashchange triggered album load');
    load_album_by_id(album_id);
}

function album_submit(event) {
    event.preventDefault();
    const album_id = document.getElementById('album-id').value;
    window.location.hash = `#${album_id}`;
    load_album_by_id(album_id);
}

function clear_album() {
    ['album-title', 'album-descriptions', 'cover', 'gallery', 'music-info'].forEach(
        id => document.getElementById(id).replaceChildren()
    );
}

function empty_album() {
    clear_album();
    document.getElementById('album-title').textContent = '图包显示区域';
    document.getElementById('album-descriptions').textContent = '在页面顶端指定一个图包ID，或者展开“菜单”看看';
}

function load_album_by_hash() {
    const album_id = hash_to_album_id();
    load_album_by_id(album_id);
}

function load_album_by_id(id) {
    document.getElementById('album-script')?.remove?.();
    if (id === null || id === '' || isNaN(id)) {
        empty_album();
        return;
    }
    let new_album_script = document.createElement('script');
    new_album_script.src = `${api_root}/apps/Welfare/detail?callback=baipiao_album&id=${id}`
    new_album_script.id = 'album-script';
    new_album_script.setAttribute('data-queried-album-id', id.toString());
    new_album_script.addEventListener('error', album_script_error);
    document.head.appendChild(new_album_script);
    clicky_log_wrapper(`#album-load-${id}`);
}

function album_script_error(event) {
    document.getElementById('album-title').textContent = '无法载入图包';
    document.getElementById('album-descriptions').textContent = 'API HTTP请求错误';
    album_id = event.target.getAttribute('data-queried-album-id');
    console.log(`图包${album_id}载入错误`, event);
    clicky_log_wrapper(`#album-error-${album_id}`);
}

function baipiao_album(album) {
    console.log('图包API返回数据', album);
    clear_album();
    if (album['error']) {
        document.getElementById('album-title').textContent = '无法载入图包';
        document.getElementById('album-descriptions').textContent = `API返回错误信息：${album['error_msg']}`;
        return;
    }
    document.getElementById('album-title').textContent = `${album['id']}：${album['title']} `;
    const album_link = document.createElement('a');
    album_link.innerHTML = '&para;'
    album_link.href = `#${album['id']}`;
    document.getElementById('album-title').appendChild(album_link);
    const description_keys = {
        'typename': '图包类型',
        'total': '图片数量',
        'tags': '标签',
        'upvote': '赞',
    }
    for (const key in description_keys) {
        if (album[key] && !(Array.isArray(album[key]) && album[key].length === 0)) {
            const new_element = document.createElement('p');
            new_element.textContent = `${description_keys[key]}：${album[key]}`;
            document.getElementById('album-descriptions').appendChild(new_element);
        }
    }
    if (album['my_img']) {
        const new_element = document.createElement('img');
        new_element.src = album['my_img'].replace(/^http:\/\//, 'https://');
        document.getElementById('cover').appendChild(new_element);
    }
    else {
        const new_element = document.createElement('p');
        new_element.textContent = '无封面图';
        document.getElementById('cover').appendChild(new_element);
    }
    if (album['thumb']) {
        for (const thumb_url of album['thumb']) {
            let new_element = document.createElement('img');
            new_element.src = thumb_url.replace(/^http:\/\//, 'https://');
            const fullsize_url = generate_fullsize_url(thumb_url);
            if (fullsize_url) {
                const img_element = new_element;
                new_element = document.createElement('a');
                new_element.href = fullsize_url;
                new_element.classList.add('glightbox');
                new_element.appendChild(img_element);
            } else {
                console.log('哎呀，居然嫖不到这张图', thumb_url);
            }
            document.getElementById('gallery').appendChild(new_element);
        }
    }
    else {
        const new_element = document.createElement('p');
        new_element.textContent = '没有图片';
        document.getElementById('gallery').appendChild(new_element);
    }
    lightbox.reload();
    document.getElementById('album-script').setAttribute('data-loaded-album-id', album['id'].toString());

    document.getElementById('music-audio').setAttribute('src', '');
    if (!album['bgm']) {
        const new_element = document.createElement('p');
        new_element.textContent = '没有BGM';
        document.getElementById('music-info').appendChild(new_element);
    }
    else {
        document.getElementById('music-audio').setAttribute('src', album['bgm'].replace(/^http:\/\//, 'https://'));
        const music_info = document.getElementById('music-info');
        const music_title = document.createElement('p');
        music_title.textContent = album['bgm_name'];
        music_info.appendChild(music_title);
        const music_img = document.createElement('img');
        music_img.src = album['bgm_img'].replace(/^http:\/\//, 'https://');
        music_info.appendChild(music_img);
    }
    clicky_log_wrapper(`#album-view-${album['id']}`);
}

function change_menu_type() {
    load_menu_by_page(1);
}

function load_menu_if_not_yet_loaded() {
    if (!document.getElementById('menu-script')) {
        load_menu_by_page(1);
    }
}

function menu_prev() {
    const current_page = parseInt(document.getElementById('menu-script').getAttribute?.('data-requested-page'));
    if (!isNaN(current_page) && current_page > 1) {
        load_menu_by_page(current_page - 1);
    }
}

function menu_next() {
    const current_page = parseInt(document.getElementById('menu-script').getAttribute?.('data-requested-page'));
    if (!isNaN(current_page)) {
        load_menu_by_page(current_page + 1);
    }
}

function submit_menu(event) {
    event.preventDefault();
    const page_number = parseInt(document.getElementById('menu-page').value);
    load_menu_by_page(page_number);
}

function load_menu_by_page(page) {
    document.getElementById('menu-script')?.remove?.();
    const new_menu_script = document.createElement('script');
    const menu_type_arg = document.getElementById('menu-type').value;
    new_menu_script.src = `${api_root}/apps/Welfare/getMenuList?callback=baipiao_menu&page=${page}&from=wx&${menu_type_arg}`;
    new_menu_script.id = 'menu-script';
    new_menu_script.setAttribute('data-requested-type-arg', menu_type_arg);
    new_menu_script.setAttribute('data-requested-page', page.toString());
    document.head.appendChild(new_menu_script);
    document.getElementById('menu-current-page').textContent = page.toString();
    document.getElementById('menu-prev').disabled = page <= 1;
    clicky_log_wrapper(`#menu-load-${page}`);
}

function baipiao_menu(menu) {
    console.log('菜单API返回数据', menu);
    const menu_body = document.getElementById('menu-body');
    menu_body.replaceChildren();

    if (menu['error']) {
        const new_element = document.createElement('p');
        new_element.textContent = `菜单载入错误：API返回 ${menu['error_msg']}`;
        menu_body.appendChild(new_element);
        return;
    }
    document.getElementById('menu-total-pages').textContent = menu['totalPage'].toString();
    document.getElementById('menu-script').setAttribute('data-loaded-page', menu['page'].toString());
    for (const entry of menu['data']) {
        const a = document.createElement('a');
        a.href = `#${entry['id']}`;
        a.addEventListener('click', () => {
            if (document.getElementById('auto-collapse-menu').checked) {
                set_part_visibility('menu', false);
            }
        });
        const figure = document.createElement('figure');
        const img = document.createElement('img');
        img.src = entry['pic'].replace(/^http:\/\//, 'https://');
        figure.appendChild(img);
        const caption = document.createElement('figcaption');
        caption.textContent = `${entry['id']}: ${entry['title']} \u{1F44D}\u2060${entry['upvote']}`;
        figure.appendChild(caption);
        a.appendChild(figure);
        menu_body.appendChild(a);
    }
    document.getElementById('menu-title').scrollIntoView();
    clicky_log_wrapper(`#menu-view-${menu['page']}`);
}

function generate_fullsize_url(thumb_url) {
    const re = /^http:\/\/img4.tuwandata.com\/v([234])\/thumb\/([0-9a-zA-Z]+)\/([0-9a-zA-Z]+={0,2})\/u\/(.*)$/;
    const match = thumb_url.match(re);
    if (!match) {
        return null;
    }
    let magic_key;
    let new_version;
    if (match[1] === '4') {
        new_version = '3';
        let current_level = prefix_tree;
        for (const c of match[3]) {
            const next_level = current_level[c];
            if (!next_level) {
                return null;
            }
            if (typeof next_level === 'string') {
                magic_key = next_level;
                break;
            }
            current_level = next_level;
        }
    }
    else {
        magic_key = atob(match[3]).split(',')[0];
        new_version = match[1];
    }
    const directory = btoa(`${magic_key},0,0,9,3,1,-1,NONE,,,90`);
    return `https://img4.tuwandata.com/v${new_version}/thumb/${match[2]}/${directory}/u/${match[4]}`;
}

function set_part_visibility(part_name, visible) {
    const div = document.getElementById(part_name);
    const show_button = document.getElementById(`show-${part_name}`);
    const hide_button = document.getElementById(`hide-${part_name}`);
    if (visible) {
        div.classList.remove('hidden');
        show_button.classList.add('hidden');
        hide_button.classList.remove('hidden');
    }
    else {
        div.classList.add('hidden');
        show_button.classList.remove('hidden');
        hide_button.classList.add('hidden');
    }
}

window.addEventListener('hashchange', onhashchange);
document.getElementById('color-scheme-select').addEventListener('change', set_color_scheme);
document.getElementById('album-form').addEventListener('submit', album_submit);
document.getElementById('album-id').value = hash_to_album_id();
document.getElementById('menu-type').addEventListener('change', change_menu_type);
document.getElementById('menu-prev').addEventListener('click', menu_prev);
document.getElementById('menu-next').addEventListener('click', menu_next);
document.getElementById('menu-form').addEventListener('submit', submit_menu);

['menu', 'music', 'options'].forEach(part_name => {
    document.getElementById(`show-${part_name}`).addEventListener('click', () => set_part_visibility(part_name, true));
    document.getElementById(`hide-${part_name}`).addEventListener('click', () => set_part_visibility(part_name, false));
});
document.getElementById('show-menu').addEventListener('click', load_menu_if_not_yet_loaded);
empty_album();
load_album_by_hash();