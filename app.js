"use strict";

/* =========================================================
   SZESZI
   Szigeti Endre Technikum
   Supabase alapú frontend
========================================================= */


/* =========================================================
   SUPABASE ELLENŐRZÉS
========================================================= */

const SZESZI_CONFIG = window.SZESZI_SUPABASE || {};

let supabaseClient = null;

if (
    window.supabase &&
    SZESZI_CONFIG.url &&
    SZESZI_CONFIG.anonKey
) {
    supabaseClient = window.supabase.createClient(
        SZESZI_CONFIG.url,
        SZESZI_CONFIG.anonKey
    );
}


/* =========================================================
   DOM SEGÉDFÜGGVÉNYEK
========================================================= */

const $ = selector =>
    document.querySelector(selector);

const $$ = selector =>
    document.querySelectorAll(selector);


function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatDate(date) {

    if (!date) {
        return "";
    }

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat(
        "hu-HU",
        {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    ).format(d);
}


function timeAgo(date) {

    if (!date) {
        return "";
    }

    const now = Date.now();
    const then = new Date(date).getTime();

    const seconds = Math.floor(
        (now - then) / 1000
    );

    if (seconds < 60) {
        return "éppen most";
    }

    const minutes = Math.floor(
        seconds / 60
    );

    if (minutes < 60) {
        return `${minutes} perce`;
    }

    const hours = Math.floor(
        minutes / 60
    );

    if (hours < 24) {
        return `${hours} órája`;
    }

    const days = Math.floor(
        hours / 24
    );

    if (days < 7) {
        return `${days} napja`;
    }

    return formatDate(date);
}


/* =========================================================
   TOAST
========================================================= */

function showToast(
    message,
    type = "info"
) {

    const toast = $("#toast");

    if (!toast) {
        return;
    }

    toast.textContent = message;

    toast.className = "";

    toast.classList.add("show");
    toast.classList.add(type);

    clearTimeout(
        window.__szesziToastTimer
    );

    window.__szesziToastTimer =
        setTimeout(() => {

            toast.classList.remove("show");

        }, 3500);
}


/* =========================================================
   MODAL
========================================================= */

function openModal(content) {

    const modal = $("#modal");
    const modalContent = $("#modalContent");

    if (!modal || !modalContent) {
        return;
    }

    modalContent.innerHTML = content;

    modal.hidden = false;

    document.body.classList.add(
        "modal-open"
    );
}


function closeModal() {

    const modal = $("#modal");

    if (!modal) {
        return;
    }

    modal.hidden = true;

    document.body.classList.remove(
        "modal-open"
    );
}


function bindModalClose() {

    document.addEventListener(
        "click",
        event => {

            if (
                event.target.matches(
                    "[data-close-modal]"
                )
            ) {
                closeModal();
            }

        }
    );
}


/* =========================================================
   APP STATE
========================================================= */

const appState = {

    user: null,

    profile: null,

    currentView: "home",

    currentConversation: null,

    realtimeChannel: null,

    notificationsChannel: null,

    searchTerm: "",

    posts: [],

    questions: [],

    conversations: [],

    groups: [],

    subjects: [],

    materials: [],

    announcements: [],

    notifications: [],

    savedPosts: [],

    darkMode: false
};


/* =========================================================
   AUTH UI
========================================================= */

function showAuthScreen() {

    const authScreen =
        $("#authScreen");

    const mainApp =
        $("#mainApp");

    if (authScreen) {
        authScreen.hidden = false;
    }

    if (mainApp) {
        mainApp.hidden = true;
    }
}


function showMainApp() {

    const authScreen =
        $("#authScreen");

    const mainApp =
        $("#mainApp");

    if (authScreen) {
        authScreen.hidden = true;
    }

    if (mainApp) {
        mainApp.hidden = false;
    }
}


function showLogin() {

    const login =
        $("#loginView");

    const register =
        $("#registerView");

    if (login) {
        login.hidden = false;
    }

    if (register) {
        register.hidden = true;
    }
}


function showRegister() {

    const login =
        $("#loginView");

    const register =
        $("#registerView");

    if (login) {
        login.hidden = true;
    }

    if (register) {
        register.hidden = false;
    }
}


/* =========================================================
   SUPABASE HIBA
========================================================= */

function getErrorMessage(error) {

    if (!error) {
        return "Ismeretlen hiba történt.";
    }

    const message =
        error.message ||
        error.error_description ||
        String(error);

    const lower =
        message.toLowerCase();

    if (
        lower.includes("invalid login credentials")
    ) {
        return "Helytelen e-mail cím vagy jelszó.";
    }

    if (
        lower.includes("email not confirmed")
    ) {
        return "Az e-mail-címed még nincs megerősítve.";
    }

    if (
        lower.includes("user already registered")
    ) {
        return "Ezzel az e-mail-címmel már létezik fiók.";
    }

    if (
        lower.includes("password")
        &&
        lower.includes("6")
    ) {
        return "A jelszónak legalább 6 karakteresnek kell lennie.";
    }

    return message;
}


/* =========================================================
   AUTH – LOGIN
========================================================= */

async function handleLogin(event) {

    event.preventDefault();

    if (!supabaseClient) {

        showToast(
            "A Supabase még nincs beállítva.",
            "error"
        );

        return;
    }

    const email =
        $("#loginEmail")?.value.trim();

    const password =
        $("#loginPassword")?.value;

    if (!email || !password) {

        showToast(
            "Töltsd ki az e-mail címet és a jelszót.",
            "error"
        );

        return;
    }

    const submitButton =
        event.submitter ||
        event.target.querySelector(
            'button[type="submit"]'
        );

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent =
            "Bejelentkezés...";
    }

    try {

        const {
            error
        } =
            await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

        if (error) {
            throw error;
        }

        showToast(
            "Sikeres bejelentkezés.",
            "success"
        );

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(error),
            "error"
        );

    } finally {

        if (submitButton) {

            submitButton.disabled = false;

            submitButton.textContent =
                "Bejelentkezés";
        }
    }
}


/* =========================================================
   AUTH – REGISTER
========================================================= */

async function handleRegister(event) {

    event.preventDefault();

    if (!supabaseClient) {

        showToast(
            "A Supabase még nincs beállítva.",
            "error"
        );

        return;
    }

    const name =
        $("#registerName")?.value.trim();

    const email =
        $("#registerEmail")?.value.trim();

    const password =
        $("#registerPassword")?.value;

    const passwordConfirm =
        $("#registerPasswordConfirm")?.value;

    const className =
        $("#registerClass")?.value.trim();

    const specialization =
        $("#registerSpecialization")?.value.trim();


    if (!name) {

        showToast(
            "Add meg a teljes neved.",
            "error"
        );

        return;
    }


    if (!email) {

        showToast(
            "Add meg az e-mail címed.",
            "error"
        );

        return;
    }


    if (!password || password.length < 6) {

        showToast(
            "A jelszónak legalább 6 karakteresnek kell lennie.",
            "error"
        );

        return;
    }


    if (password !== passwordConfirm) {

        showToast(
            "A két jelszó nem egyezik.",
            "error"
        );

        return;
    }


    const submitButton =
        event.submitter ||
        event.target.querySelector(
            'button[type="submit"]'
        );

    if (submitButton) {

        submitButton.disabled = true;

        submitButton.textContent =
            "Regisztráció...";
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.signUp({

                email,

                password,

                options: {

                    data: {

                        name,

                        class_name:
                            className || null,

                        specialization:
                            specialization || null
                    }
                }
            });


        if (error) {
            throw error;
        }


        /*
         * Ha a Supabase-nél ki van kapcsolva
         * az e-mail megerősítés,
         * akkor azonnal lehet session.
         *
         * Ha be van kapcsolva,
         * a felhasználónak előbb meg kell erősítenie
         * az e-mail címét.
         */

        if (data.session) {

            await ensureProfile();

            showToast(
                "Sikeres regisztráció.",
                "success"
            );

        } else {

            showToast(
                "A regisztráció sikerült. Ellenőrizd az e-mail címedet a megerősítéshez.",
                "success"
            );

            showLogin();
        }

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(error),
            "error"
        );

    } finally {

        if (submitButton) {

            submitButton.disabled = false;

            submitButton.textContent =
                "Regisztráció";
        }
    }
}


/* =========================================================
   AUTH – LOGOUT
========================================================= */

async function logout() {

    if (!supabaseClient) {
        return;
    }

    try {

        await supabaseClient.auth.signOut();

        appState.user = null;
        appState.profile = null;

        showAuthScreen();

        showLogin();

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


/* =========================================================
   PROFILE BETÖLTÉS
========================================================= */

async function loadProfile() {

    if (!supabaseClient || !appState.user) {
        return null;
    }

    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select("*")
            .eq(
                "id",
                appState.user.id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Profil betöltési hiba:",
            error
        );

        return null;
    }


    appState.profile = data;

    return data;
}


/* =========================================================
   PROFILE LÉTREHOZÁS
========================================================= */

async function ensureProfile() {

    if (
        !supabaseClient ||
        !appState.user
    ) {
        return;
    }


    const existing =
        await loadProfile();


    if (existing) {
        updateProfileUI();
        return;
    }


    const metadata =
        appState.user.user_metadata ||
        {};


    const name =
        metadata.name ||
        appState.user.email ||
        "Felhasználó";


    const className =
        metadata.class_name ||
        null;


    const specialization =
        metadata.specialization ||
        null;


    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .insert({

                id: appState.user.id,

                name,

                class_name:
                    className,

                bio: null,

                avatar_url: null,

                role: "student"

            })
            .select()
            .single();


    if (error) {

        /*
         * Ha trigger már létrehozta,
         * akkor újra megpróbáljuk betölteni.
         */

        console.warn(
            "Profil létrehozási figyelmeztetés:",
            error
        );

        await loadProfile();

        updateProfileUI();

        return;
    }


    appState.profile = data;

    updateProfileUI();
}


/* =========================================================
   PROFILE UI
========================================================= */

function getInitials(name) {

    if (!name) {
        return "?";
    }

    const parts =
        name
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (!parts.length) {
        return "?";
    }


    if (parts.length === 1) {

        return parts[0]
            .slice(0, 2)
            .toUpperCase();
    }


    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();
}


function avatarHTML(
    profile,
    size = ""
) {

    const name =
        profile?.name ||
        "Felhasználó";


    const avatar =
        profile?.avatar_url;


    if (avatar) {

        return `
            <div class="avatar ${size}">
                <img
                    src="${escapeHTML(avatar)}"
                    alt="${escapeHTML(name)}"
                >
            </div>
        `;
    }


    return `
        <div class="avatar ${size}">
            ${escapeHTML(
                getInitials(name)
            )}
        </div>
    `;
}


function updateProfileUI() {

    const profile =
        appState.profile;


    const topAvatar =
        $("#topAvatar");


    if (topAvatar && profile) {

        if (profile.avatar_url) {

            topAvatar.innerHTML = `
                <img
                    src="${escapeHTML(
                        profile.avatar_url
                    )}"
                    alt="${escapeHTML(
                        profile.name
                    )}"
                >
            `;

        } else {

            topAvatar.textContent =
                getInitials(
                    profile.name
                );
        }
    }


    const adminNav =
        $("#adminNav");


    if (adminNav) {

        adminNav.hidden =
            !profile ||
            ![
                "admin",
                "teacher"
            ].includes(
                profile.role
            );
    }
}


/* =========================================================
   VIEW KEZELÉS
========================================================= */

function setActiveNavigation(view) {

    $$(".nav-item").forEach(item => {

        item.classList.toggle(
            "active",
            item.dataset.view === view
        );

    });


    $$(".bottom-nav button").forEach(item => {

        item.classList.toggle(
            "active",
            item.dataset.view === view
        );

    });
}


async function navigate(view) {

    appState.currentView =
        view || "home";


    setActiveNavigation(
        appState.currentView
    );


    closeMobileSidebar();


    const page =
        $("#page");


    if (!page) {
        return;
    }


    page.innerHTML = `
        <div class="loading-state">
            Betöltés...
        </div>
    `;


    try {

        switch (appState.currentView) {

            case "home":
                await renderHome();
                break;

            case "questions":
                await renderQuestions();
                break;

            case "messages":
                await renderMessages();
                break;

            case "groups":
                await renderGroups();
                break;

            case "subjects":
                await renderSubjects();
                break;

            case "materials":
                await renderMaterials();
                break;

            case "announcements":
                await renderAnnouncements();
                break;

            case "saved":
                await renderSaved();
                break;

            case "profile":
                await renderProfile();
                break;

            case "notifications":
                await renderNotifications();
                break;

            case "settings":
                await renderSettings();
                break;

            case "admin":
                await renderAdmin();
                break;

            default:
                await renderHome();
        }

    } catch (error) {

        console.error(error);

        page.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    ⚠️
                </div>

                <h2>Nem sikerült betölteni az oldalt</h2>

                <p>
                    ${escapeHTML(
                        getErrorMessage(error)
                    )}
                </p>
            </div>
        `;
    }
}


/* =========================================================
   MOBILE SIDEBAR
========================================================= */

function toggleSidebar() {

    const sidebar =
        $("#sidebar");

    if (!sidebar) {
        return;
    }

    sidebar.classList.toggle(
        "open"
    );
}


function closeMobileSidebar() {

    const sidebar =
        $("#sidebar");

    if (!sidebar) {
        return;
    }

    sidebar.classList.remove(
        "open"
    );
}


/* =========================================================
   HOME
========================================================= */

async function renderHome() {

    const page =
        $("#page");


    const {
        data,
        error
    } =
        await supabaseClient
            .from("posts")
            .select(`
                *,
                profiles (
                    id,
                    name,
                    class_name,
                    role,
                    avatar_url
                )
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(50);


    if (error) {
        throw error;
    }


    appState.posts =
        data || [];


    page.innerHTML = `

        <div class="page-header">

            <div>

                <h1>Kezdőlap</h1>

                <p>
                    Mi újság a SZESZI-ben?
                </p>

            </div>

        </div>


        ${renderComposer()}


        <div id="feed">

            ${
                appState.posts.length
                ?
                appState.posts
                    .map(renderPost)
                    .join("")
                :
                renderEmptyState(
                    "📝",
                    "Még nincs bejegyzés",
                    "Legyél te az első, aki közzétesz valamit."
                )
            }

        </div>
    `;
}


/* =========================================================
   POST COMPOSER
========================================================= */

function renderComposer() {

    const name =
        appState.profile?.name ||
        "Felhasználó";


    return `

        <section class="composer card">

            <div class="composer-top">

                ${avatarHTML(
                    appState.profile,
                    "small"
                )}

                <button
                    class="composer-input"
                    type="button"
                    data-action="open-post-modal"
                >
                    Mire gondolsz, ${escapeHTML(
                        name.split(" ")[0]
                    )}?
                </button>

            </div>

        </section>
    `;
}


/* =========================================================
   POST RENDER
========================================================= */

function renderPost(post) {

    const profile =
        post.profiles ||
        {};


    const body =
        escapeHTML(
            post.body
        ).replaceAll(
            "\n",
            "<br>"
        );


    return `

        <article
            class="post-card card"
            data-post-id="${post.id}"
        >

            <div class="post-header">

                ${avatarHTML(
                    profile,
                    "small"
                )}

                <div class="post-author">

                    <strong>
                        ${escapeHTML(
                            profile.name ||
                            "Felhasználó"
                        )}
                    </strong>

                    <span>

                        ${
                            profile.class_name
                            ?
                            escapeHTML(
                                profile.class_name
                            ) + " · "
                            :
                            ""
                        }

                        ${timeAgo(
                            post.created_at
                        )}

                    </span>

                </div>

            </div>


            <div class="post-body">

                <p>
                    ${body}
                </p>

                ${
                    post.image_url
                    ?
                    `
                        <img
                            class="post-image"
                            src="${escapeHTML(
                                post.image_url
                            )}"
                            alt="Bejegyzés képe"
                        >
                    `
                    :
                    ""
                }

            </div>


            <div class="post-actions">

                <button
                    type="button"
                    data-action="like-post"
                    data-id="${post.id}"
                >
                    👍
                    <span>
                        Tetszik
                    </span>
                </button>


                <button
                    type="button"
                    data-action="open-comments"
                    data-id="${post.id}"
                >
                    💬
                    <span>
                        Komment
                    </span>
                </button>


                <button
                    type="button"
                    data-action="save-post"
                    data-id="${post.id}"
                >
                    🔖
                    <span>
                        Mentés
                    </span>
                </button>


                <button
                    type="button"
                    data-action="share-post"
                    data-id="${post.id}"
                >
                    ↗️
                    <span>
                        Megosztás
                    </span>
                </button>

            </div>


            <div
                class="post-comments"
                id="comments-${post.id}"
                hidden
            ></div>

        </article>
    `;
}


/* =========================================================
   ÚJ BEJEGYZÉS
========================================================= */

function openPostModal() {

    openModal(`

        <div class="modal-header">

            <h2>
                Új bejegyzés
            </h2>

            <p>
                Ossz meg valamit a SZESZI közösségével.
            </p>

        </div>


        <form id="createPostForm">

            <div class="form-group">

                <label for="postBody">
                    Bejegyzés
                </label>

                <textarea
                    id="postBody"
                    rows="6"
                    maxlength="5000"
                    placeholder="Írj valamit..."
                    required
                ></textarea>

            </div>


            <div class="form-group">

                <label for="postImageUrl">
                    Kép URL
                </label>

                <input
                    id="postImageUrl"
                    type="url"
                    placeholder="https://..."
                >

                <small>
                    A valódi fájlfeltöltést a Supabase Storage következő részében kapcsoljuk be.
                </small>

            </div>


            <button
                class="primary-btn full-width"
                type="submit"
            >
                Közzététel
            </button>

        </form>
    `);
}


async function createPost(event) {

    event.preventDefault();


    const body =
        $("#postBody")?.value.trim();


    const imageUrl =
        $("#postImageUrl")?.value.trim() ||
        null;


    if (!body) {

        showToast(
            "A bejegyzés nem lehet üres.",
            "error"
        );

        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("posts")
                .insert({

                    author_id:
                        appState.user.id,

                    body,

                    image_url:
                        imageUrl

                });


        if (error) {
            throw error;
        }


        closeModal();

        showToast(
            "Bejegyzés közzétéve.",
            "success"
        );


        if (
            appState.currentView ===
            "home"
        ) {
            await renderHome();
        }

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


/* =========================================================
   KOMMENTEK
========================================================= */

async function loadComments(
    postId
) {

    const container =
        $(`#comments-${postId}`);


    if (!container) {
        return;
    }


    container.hidden = false;


    container.innerHTML = `
        <div class="loading-state">
            Kommentek betöltése...
        </div>
    `;


    const {
        data,
        error
    } =
        await supabaseClient
            .from("comments")
            .select(`
                *,
                profiles (
                    id,
                    name,
                    class_name,
                    avatar_url
                )
            `)
            .eq(
                "post_id",
                postId
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (error) {

        container.innerHTML = `
            <div class="error-text">
                ${escapeHTML(
                    getErrorMessage(error)
                )}
            </div>
        `;

        return;
    }


    container.innerHTML = `

        <div class="comments-list">

            ${
                data?.length
                ?
                data.map(comment => `

                    <div class="comment">

                        ${avatarHTML(
                            comment.profiles,
                            "tiny"
                        )}

                        <div>

                            <strong>
                                ${escapeHTML(
                                    comment.profiles?.name ||
                                    "Felhasználó"
                                )}
                            </strong>

                            <p>
                                ${escapeHTML(
                                    comment.body
                                )}
                            </p>

                            <small>
                                ${timeAgo(
                                    comment.created_at
                                )}
                            </small>

                        </div>

                    </div>

                `).join("")
                :
                `
                    <div class="empty-inline">
                        Még nincs komment.
                    </div>
                `
            }

        </div>


        <form
            class="comment-form"
            data-comment-form="${postId}"
        >

            <input
                type="text"
                placeholder="Írj egy kommentet..."
                maxlength="2000"
                required
            >

            <button
                type="submit"
                class="primary-btn"
            >
                Küldés
            </button>

        </form>
    `;
}


async function createComment(
    event,
    postId
) {

    event.preventDefault();


    const input =
        event.target.querySelector(
            "input"
        );


    const body =
        input?.value.trim();


    if (!body) {
        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("comments")
                .insert({

                    post_id:
                        postId,

                    author_id:
                        appState.user.id,

                    body

                });


        if (error) {
            throw error;
        }


        input.value = "";

        await loadComments(
            postId
        );

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


/* =========================================================
   REAKCIÓ
========================================================= */

async function toggleLike(
    postId
) {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("post_reactions")
                .select("post_id")
                .eq(
                    "post_id",
                    postId
                )
                .eq(
                    "user_id",
                    appState.user.id
                )
                .maybeSingle();


        if (error) {
            throw error;
        }


        if (data) {

            const {
                error: deleteError
            } =
                await supabaseClient
                    .from("post_reactions")
                    .delete()
                    .eq(
                        "post_id",
                        postId
                    )
                    .eq(
                        "user_id",
                        appState.user.id
                    );


            if (deleteError) {
                throw deleteError;
            }


            showToast(
                "Reakció eltávolítva.",
                "info"
            );

        } else {

            const {
                error: insertError
            } =
                await supabaseClient
                    .from("post_reactions")
                    .insert({

                        post_id:
                            postId,

                        user_id:
                            appState.user.id,

                        reaction:
                            "like"

                    });


            if (insertError) {
                throw insertError;
            }


            showToast(
                "👍 Reakció hozzáadva.",
                "success"
            );
        }

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


/* =========================================================
   MENTÉS
========================================================= */

async function toggleSavePost(
    postId
) {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("saved_posts")
                .select("post_id")
                .eq(
                    "post_id",
                    postId
                )
                .eq(
                    "user_id",
                    appState.user.id
                )
                .maybeSingle();


        if (error) {
            throw error;
        }


        if (data) {

            const {
                error: deleteError
            } =
                await supabaseClient
                    .from("saved_posts")
                    .delete()
                    .eq(
                        "post_id",
                        postId
                    )
                    .eq(
                        "user_id",
                        appState.user.id
                    );


            if (deleteError) {
                throw deleteError;
            }


            showToast(
                "Eltávolítva a mentésekből.",
                "info"
            );

        } else {

            const {
                error: insertError
            } =
                await supabaseClient
                    .from("saved_posts")
                    .insert({

                        user_id:
                            appState.user.id,

                        post_id:
                            postId

                    });


            if (insertError) {
                throw insertError;
            }


            showToast(
                "Bejegyzés elmentve.",
                "success"
            );
        }

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


/* =========================================================
   MEGOSZTÁS
========================================================= */

async function sharePost(
    postId
) {

    const url =
        `${window.location.origin}${window.location.pathname}#post-${postId}`;


    try {

        if (
            navigator.share
        ) {

            await navigator.share({

                title:
                    "SZESZI bejegyzés",

                url

            });

        } else if (
            navigator.clipboard
        ) {

            await navigator.clipboard.writeText(
                url
            );

            showToast(
                "A bejegyzés linkje kimásolva.",
                "success"
            );
        }

    } catch (error) {

        if (
            error?.name !==
            "AbortError"
        ) {

            console.error(error);

            showToast(
                "A megosztás nem sikerült.",
                "error"
            );
        }
    }
}


/* =========================================================
   QUESTIONS
========================================================= */

async function renderQuestions() {

    const page =
        $("#page");


    const {
        data,
        error
    } =
        await supabaseClient
            .from("questions")
            .select(`
                *,
                profiles (
                    id,
                    name,
                    class_name,
                    avatar_url
                )
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {
        throw error;
    }


    appState.questions =
        data || [];


    page.innerHTML = `

        <div class="page-header">

            <div>

                <h1>Kérdések</h1>

                <p>
                    Tegyél fel kérdést, vagy segíts másoknak.
                </p>

            </div>


            <button
                class="primary-btn"
                data-action="open-question-modal"
                type="button"
            >
                ＋ Kérdés feltevése
            </button>

        </div>


        <div class="questions-list">

            ${
                appState.questions.length
                ?
                appState.questions
                    .map(renderQuestion)
                    .join("")
                :
                renderEmptyState(
                    "❓",
                    "Még nincs kérdés",
                    "Tegyél fel egy kérdést a közösségnek."
                )
            }

        </div>
    `;
}


function renderQuestion(question) {

    const profile =
        question.profiles ||
        {};


    return `

        <article
            class="question-card card"
            data-question-id="${question.id}"
        >

            <div class="question-header">

                ${avatarHTML(
                    profile,
                    "small"
                )}

                <div>

                    <strong>
                        ${escapeHTML(
                            profile.name ||
                            "Felhasználó"
                        )}
                    </strong>

                    <span>
                        ${timeAgo(
                            question.created_at
                        )}
                    </span>

                </div>


                ${
                    question.solved
                    ?
                    `
                        <span class="status-badge success">
                            Megoldva
                        </span>
                    `
                    :
                    `
                        <span class="status-badge">
                            Nyitott
                        </span>
                    `
                }

            </div>


            <div class="question-content">

                ${
                    question.subject
                    ?
                    `
                        <span class="subject-badge">
                            ${escapeHTML(
                                question.subject
                            )}
                        </span>
                    `
                    :
                    ""
                }


                <h3>
                    ${escapeHTML(
                        question.title
                    )}
                </h3>


                <p>
                    ${escapeHTML(
                        question.body
                    )}
                </p>

            </div>


            <div class="question-actions">

                <button
                    type="button"
                    data-action="open-question"
                    data-id="${question.id}"
                >
                    💬 Válaszok
                </button>

            </div>

        </article>
    `;
}


function openQuestionModal() {

    openModal(`

        <div class="modal-header">

            <h2>
                Kérdés feltevése
            </h2>

            <p>
                A kérdésedet a SZESZI közössége láthatja.
            </p>

        </div>


        <form id="createQuestionForm">

            <div class="form-group">

                <label for="questionTitle">
                    Kérdés címe
                </label>

                <input
                    id="questionTitle"
                    type="text"
                    maxlength="200"
                    placeholder="Mi a kérdésed?"
                    required
                >

            </div>


            <div class="form-group">

                <label for="questionSubject">
                    Tantárgy
                </label>

                <input
                    id="questionSubject"
                    type="text"
                    maxlength="100"
                    placeholder="Például: Programozás"
                >

            </div>


            <div class="form-group">

                <label for="questionBody">
                    Részletek
                </label>

                <textarea
                    id="questionBody"
                    rows="7"
                    maxlength="5000"
                    placeholder="Írd le részletesen..."
                    required
                ></textarea>

            </div>


            <button
                type="submit"
                class="primary-btn full-width"
            >
                Kérdés közzététele
            </button>

        </form>
    `);
}


async function createQuestion(
    event
) {

    event.preventDefault();


    const title =
        $("#questionTitle")
            ?.value
            .trim();


    const subject =
        $("#questionSubject")
            ?.value
            .trim() ||
        null;


    const body =
        $("#questionBody")
            ?.value
            .trim();


    if (!title || !body) {

        showToast(
            "A cím és a kérdés szövege kötelező.",
            "error"
        );

        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("questions")
                .insert({

                    author_id:
                        appState.user.id,

                    title,

                    body,

                    subject

                });


        if (error) {
            throw error;
        }


        closeModal();

        showToast(
            "Kérdés közzétéve.",
            "success"
        );


        await renderQuestions();

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


/* =========================================================
   QUESTION DETAILS
========================================================= */

async function openQuestion(
    questionId
) {

    const question =
        appState.questions.find(
            item =>
                item.id === questionId
        );


    if (!question) {
        return;
    }


    const {
        data: answers,
        error
    } =
        await supabaseClient
            .from("answers")
            .select(`
                *,
                profiles (
                    id,
                    name,
                    class_name,
                    role,
                    avatar_url
                )
            `)
            .eq(
                "question_id",
                questionId
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (error) {

        showToast(
            getErrorMessage(error),
            "error"
        );

        return;
    }


    openModal(`

        <div class="modal-header">

            <span class="subject-badge">
                ${
                    question.subject
                    ?
                    escapeHTML(
                        question.subject
                    )
                    :
                    "Kérdés"
                }
            </span>

            <h2>
                ${escapeHTML(
                    question.title
                )}
            </h2>

            <p>
                ${escapeHTML(
                    question.body
                )}
            </p>

        </div>


        <div class="answers-list">

            <h3>
                Válaszok
            </h3>


            ${
                answers?.length
                ?
                answers.map(answer => `

                    <div
                        class="answer-card ${
                            answer.is_best
                            ? "best-answer"
                            : ""
                        }"
                    >

                        <div class="answer-header">

                            ${avatarHTML(
                                answer.profiles,
                                "tiny"
                            )}

                            <div>

                                <strong>
                                    ${escapeHTML(
                                        answer.profiles?.name ||
                                        "Felhasználó"
                                    )}
                                </strong>

                                <small>
                                    ${timeAgo(
                                        answer.created_at
                                    )}
                                </small>

                            </div>

                        </div>


                        <p>
                            ${escapeHTML(
                                answer.body
                            )}
                        </p>


                        ${
                            answer.is_best
                            ?
                            `
                                <span class="status-badge success">
                                    ✓ Elfogadott válasz
                                </span>
                            `
                            :
                            ""
                        }

                    </div>

                `).join("")
                :
                `
                    <div class="empty-inline">
                        Még nincs válasz.
                    </div>
                `
            }

        </div>


        <form
            id="answerQuestionForm"
            data-question-id="${questionId}"
        >

            <div class="form-group">

                <label for="answerBody">
                    Válasz
                </label>

                <textarea
                    id="answerBody"
                    rows="5"
                    maxlength="5000"
                    placeholder="Segíts a kérdezőnek..."
                    required
                ></textarea>

            </div>


            <button
                class="primary-btn full-width"
                type="submit"
            >
                Válasz elküldése
            </button>

        </form>
    `);
}


async function createAnswer(
    event
) {

    event.preventDefault();


    const questionId =
        event.target.dataset.questionId;


    const body =
        $("#answerBody")
            ?.value
            .trim();


    if (!body) {
        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("answers")
                .insert({

                    question_id:
                        questionId,

                    author_id:
                        appState.user.id,

                    body

                });


        if (error) {
            throw error;
        }


        showToast(
            "Válasz elküldve.",
            "success"
        );


        await openQuestion(
            questionId
        );

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


/* =========================================================
   MESSAGES
========================================================= */

async function loadConversations() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("conversation_members")
            .select(`
                conversation_id,
                conversations (
                    id,
                    name,
                    is_group,
                    created_at
                )
            `)
            .eq(
                "user_id",
                appState.user.id
            );


    if (error) {
        throw error;
    }


    appState.conversations =
        (data || [])
            .map(item =>
                item.conversations
            )
            .filter(Boolean);
}


async function renderMessages() {

    await loadConversations();


    const page =
        $("#page");


    page.innerHTML = `

        <div class="page-header">

            <div>

                <h1>Üzenetek</h1>

                <p>
                    Privát és csoportos beszélgetések.
                </p>

            </div>


            <button
                class="primary-btn"
                type="button"
                data-action="new-message"
            >
                ＋ Új üzenet
            </button>

        </div>


        <div class="messages-layout">

            <aside class="conversation-list">

                ${
                    appState.conversations.length
                    ?
                    appState.conversations
                        .map(renderConversation)
                        .join("")
                    :
                    `
                        <div class="empty-inline">
                            Még nincs beszélgetés.
                        </div>
                    `
                }

            </aside>


            <section
                class="chat-panel"
                id="chatPanel"
            >

                ${
                    appState.currentConversation
                    ?
                    `
                        <div class="loading-state">
                            Beszélgetés betöltése...
                        </div>
                    `
                    :
                    `
                        <div class="empty-state compact">

                            <div class="empty-icon">
                                💬
                            </div>

                            <h3>
                                Válassz egy beszélgetést
                            </h3>

                            <p>
                                Itt jelennek meg az üzeneteid.
                            </p>

                        </div>
                    `
                }

            </section>

        </div>
    `;


    if (
        appState.currentConversation
    ) {

        await openConversation(
            appState.currentConversation
        );
    }
}


function renderConversation(
    conversation
) {

    return `

        <button
            class="conversation-item"
            type="button"
            data-action="open-conversation"
            data-id="${conversation.id}"
        >

            <div class="avatar small">
                ${
                    conversation.is_group
                    ?
                    "👥"
                    :
                    "💬"
                }
            </div>

            <div>

                <strong>
                    ${
                        escapeHTML(
                            conversation.name ||
                            "Beszélgetés"
                        )
                    }
                </strong>

                <span>
                    ${
                        conversation.is_group
                        ?
                        "Csoport"
                        :
                        "Privát beszélgetés"
                    }
                </span>

            </div>

        </button>
    `;
}


/* =========================================================
   CONVERSATION
========================================================= */

async function openConversation(
    conversationId
) {

    appState.currentConversation =
        conversationId;


    const panel =
        $("#chatPanel");


    if (!panel) {
        return;
    }


    panel.innerHTML = `
        <div class="loading-state">
            Üzenetek betöltése...
        </div>
    `;


    const conversation =
        appState.conversations.find(
            item =>
                item.id ===
                conversationId
        );


    const {
        data: messages,
        error
    } =
        await supabaseClient
            .from("messages")
            .select(`
                *,
                profiles (
                    id,
                    name,
                    avatar_url
                )
            `)
            .eq(
                "conversation_id",
                conversationId
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (error) {
        throw error;
    }


    panel.innerHTML = `

        <div class="chat-header">

            <div>

                <strong>
                    ${
                        escapeHTML(
                            conversation?.name ||
                            "Beszélgetés"
                        )
                    }
                </strong>

                <span>
                    ${
                        conversation?.is_group
                        ?
                        "Csoport"
                        :
                        "Privát beszélgetés"
                    }
                </span>

            </div>

        </div>


        <div
            class="chat-messages"
            id="chatMessages"
        >

            ${
                messages?.length
                ?
                messages
                    .map(
                        renderMessage
                    )
                    .join("")
                :
                `
                    <div class="empty-state compact">
                        <div class="empty-icon">
                            💬
                        </div>
                        <p>
                            Még nincs üzenet.
                        </p>
                    </div>
                `
            }

        </div>


        <form
            id="messageForm"
            data-conversation-id="${conversationId}"
            class="chat-input"
        >

            <input
                id="messageInput"
                type="text"
                maxlength="5000"
                placeholder="Írj egy üzenetet..."
                autocomplete="off"
                required
            >

            <button
                class="primary-btn"
                type="submit"
            >
                Küldés
            </button>

        </form>
    `;


    scrollChatToBottom();

    subscribeToConversation(
        conversationId
    );
}


function renderMessage(
    message
) {

    const own =
        message.sender_id ===
        appState.user.id;


    return `

        <div
            class="message-row ${
                own ? "own" : ""
            }"
        >

            ${
                own
                ?
                ""
                :
                avatarHTML(
                    message.profiles,
                    "tiny"
                )
            }


            <div class="message-bubble">

                <p>
                    ${escapeHTML(
                        message.body || ""
                    )}
                </p>

                ${
                    message.file_url
                    ?
                    `
                        <a
                            href="${escapeHTML(
                                message.file_url
                            )}"
                            target="_blank"
                            rel="noopener"
                        >
                            📎 Fájl
                        </a>
                    `
                    :
                    ""
                }

                <small>
                    ${timeAgo(
                        message.created_at
                    )}
                </small>

            </div>

        </div>
    `;
}


async function sendMessage(
    event
) {

    event.preventDefault();


    const form =
        event.target;


    const conversationId =
        form.dataset.conversationId;


    const input =
        $("#messageInput");


    const body =
        input?.value.trim();


    if (!body) {
        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("messages")
                .insert({

                    conversation_id:
                        conversationId,

                    sender_id:
                        appState.user.id,

                    body

                });


        if (error) {
            throw error;
        }


        input.value = "";

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


/* =========================================================
   REALTIME CHAT
========================================================= */

function subscribeToConversation(
    conversationId
) {

    if (!supabaseClient) {
        return;
    }


    if (
        appState.realtimeChannel
    ) {

        supabaseClient
            .removeChannel(
                appState.realtimeChannel
            );

        appState.realtimeChannel =
            null;
    }


    appState.realtimeChannel =
        supabaseClient
            .channel(
                `messages-${conversationId}`
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter:
                        `conversation_id=eq.${conversationId}`
                },
                async payload => {

                    const message =
                        payload.new;


                    const {
                        data
                    } =
                        await supabaseClient
                            .from("messages")
                            .select(`
                                *,
                                profiles (
                                    id,
                                    name,
                                    avatar_url
                                )
                            `)
                            .eq(
                                "id",
                                message.id
                            )
                            .single();


                    if (!data) {
                        return;
                    }


                    const container =
                        $("#chatMessages");


                    if (!container) {
                        return;
                    }


                    /*
                     * Megakadályozzuk,
                     * hogy saját üzenetünk
                     * kétszer jelenjen meg,
                     * ha a realtime már bekerült.
                     */

                    if (
                        container.querySelector(
                            `[data-message-id="${data.id}"]`
                        )
                    ) {
                        return;
                    }


                    const wrapper =
                        document.createElement(
                            "div"
                        );


                    wrapper.dataset.messageId =
                        data.id;


                    wrapper.innerHTML =
                        renderMessage(data);


                    container.appendChild(
                        wrapper
                    );


                    scrollChatToBottom();
                }
            )
            .subscribe();
}


function scrollChatToBottom() {

    const container =
        $("#chatMessages");


    if (!container) {
        return;
    }


    setTimeout(() => {

        container.scrollTop =
            container.scrollHeight;

    }, 50);
}


/* =========================================================
   ÚJ ÜZENET
========================================================= */

async function openNewMessageModal() {

    /*
     * A profilokból keresünk felhasználót.
     * Ez később saját keresőfelületté bővíthető.
     */

    const {
        data: users,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select(`
                id,
                name,
                class_name,
                avatar_url
            `)
            .neq(
                "id",
                appState.user.id
            )
            .order(
                "name"
            )
            .limit(100);


    if (error) {

        showToast(
            getErrorMessage(error),
            "error"
        );

        return;
    }


    openModal(`

        <div class="modal-header">

            <h2>
                Új beszélgetés
            </h2>

            <p>
                Válassz egy felhasználót.
            </p>

        </div>


        <div class="user-picker">

            ${
                users?.length
                ?
                users.map(user => `

                    <button
                        class="user-picker-item"
                        type="button"
                        data-action="start-chat"
                        data-id="${user.id}"
                    >

                        ${avatarHTML(
                            user,
                            "small"
                        )}

                        <div>

                            <strong>
                                ${escapeHTML(
                                    user.name
                                )}
                            </strong>

                            <span>
                                ${
                                    user.class_name
                                    ?
                                    escapeHTML(
                                        user.class_name
                                    )
                                    :
                                    ""
                                }
                            </span>

                        </div>

                    </button>

                `).join("")
                :
                `
                    <div class="empty-inline">
                        Nincs választható felhasználó.
                    </div>
                `
            }

        </div>
    `);
}


async function startPrivateChat(
    targetUserId
) {

    try {

        /*
         * Megnézzük, van-e már olyan
         * privát beszélgetés,
         * amelyben mindketten benne vannak.
         */

        const {
            data: myMemberships,
            error
        } =
            await supabaseClient
                .from("conversation_members")
                .select(
                    "conversation_id"
                )
                .eq(
                    "user_id",
                    appState.user.id
                );


        if (error) {
            throw error;
        }


        const conversationIds =
            (myMemberships || [])
                .map(
                    item =>
                        item.conversation_id
                );


        let existing = null;


        for (
            const conversationId
            of conversationIds
        ) {

            const {
                data: members,
                error: memberError
            } =
                await supabaseClient
                    .from(
                        "conversation_members"
                    )
                    .select(
                        "user_id"
                    )
                    .eq(
                        "conversation_id",
                        conversationId
                    );


            if (memberError) {
                continue;
            }


            const ids =
                (members || [])
                    .map(
                        item =>
                            item.user_id
                    );


            if (
                ids.length === 2 &&
                ids.includes(
                    targetUserId
                ) &&
                ids.includes(
                    appState.user.id
                )
            ) {

                const {
                    data: conversation
                } =
                    await supabaseClient
                        .from(
                            "conversations"
                        )
                        .select("*")
                        .eq(
                            "id",
                            conversationId
                        )
                        .eq(
                            "is_group",
                            false
                        )
                        .maybeSingle();


                if (conversation) {

                    existing =
                        conversation;

                    break;
                }
            }
        }


        if (existing) {

            closeModal();

            await renderMessages();

            await openConversation(
                existing.id
            );

            return;
        }


        const {
            data: targetUser
        } =
            await supabaseClient
                .from("profiles")
                .select("name")
                .eq(
                    "id",
                    targetUserId
                )
                .single();


        const {
            data: conversation,
            error: conversationError
        } =
            await supabaseClient
                .from("conversations")
                .insert({

                    name:
                        targetUser?.name ||
                        "Beszélgetés",

                    is_group:
                        false

                })
                .select()
                .single();


        if (conversationError) {
            throw conversationError;
        }


        const {
            error: memberError
        } =
            await supabaseClient
                .from(
                    "conversation_members"
                )
                .insert([

                    {
                        conversation_id:
                            conversation.id,

                        user_id:
                            appState.user.id
                    },

                    {
                        conversation_id:
                            conversation.id,

                        user_id:
                            targetUserId
                    }

                ]);


        if (memberError) {
            throw memberError;
        }


        closeModal();

        await renderMessages();

        await openConversation(
            conversation.id
        );


        showToast(
            "Beszélgetés létrehozva.",
            "success"
        );

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


/* =========================================================
   GROUPS
========================================================= */

async function renderGroups() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("groups")
            .select(`
                *,
                profiles:created_by (
                    name,
                    avatar_url
                )
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {
        throw error;
    }


    appState.groups =
        data || [];


    const page =
        $("#page");


    page.innerHTML = `

        <div class="page-header">

            <div>

                <h1>Csoportok</h1>

                <p>
                    Osztályok, tanulócsoportok és közösségek.
                </p>

            </div>


            <button
                class="primary-btn"
                type="button"
                data-action="open-group-modal"
            >
                ＋ Csoport létrehozása
            </button>

        </div>


        <div class="group-grid">

            ${
                appState.groups.length
                ?
                appState.groups
                    .map(renderGroup)
                    .join("")
                :
                renderEmptyState(
                    "👥",
                    "Még nincs csoport",
                    "Hozz létre egy tanulócsoportot."
                )
            }

        </div>
    `;
}


function renderGroup(group) {

    return `

        <article class="group-card card">

            <div class="group-icon">
                👥
            </div>

            <div>

                <h3>
                    ${escapeHTML(
                        group.name
                    )}
                </h3>

                <p>
                    ${escapeHTML(
                        group.description ||
                        "Nincs leírás."
                    )}
                </p>

            </div>


            <button
                class="secondary-btn"
                type="button"
                data-action="join-group"
                data-id="${group.id}"
            >
                Csatlakozás
            </button>

        </article>
    `;
}


function openGroupModal() {

    openModal(`

        <div class="modal-header">

            <h2>
                Új csoport
            </h2>

            <p>
                Hozz létre egy tanulócsoportot.
            </p>

        </div>


        <form id="createGroupForm">

            <div class="form-group">

                <label for="groupName">
                    Csoport neve
                </label>

                <input
                    id="groupName"
                    type="text"
                    maxlength="150"
                    required
                >

            </div>


            <div class="form-group">

                <label for="groupDescription">
                    Leírás
                </label>

                <textarea
                    id="groupDescription"
                    rows="5"
                    maxlength="2000"
                ></textarea>

            </div>


            <button
                type="submit"
                class="primary-btn full-width"
            >
                Csoport létrehozása
            </button>

        </form>
    `);
}


async function createGroup(
    event
) {

    event.preventDefault();


    const name =
        $("#groupName")
            ?.value
            .trim();


    const description =
        $("#groupDescription")
            ?.value
            .trim() ||
        null;


    if (!name) {
        return;
    }


    try {

        const {
            data: group,
            error
        } =
            await supabaseClient
                .from("groups")
                .insert({

                    name,

                    description,

                    created_by:
                        appState.user.id

                })
                .select()
                .single();


        if (error) {
            throw error;
        }


        await supabaseClient
            .from("group_members")
            .insert({

                group_id:
                    group.id,

                user_id:
                    appState.user.id,

                role:
                    "owner"

            });


        closeModal();

        showToast(
            "Csoport létrehozva.",
            "success"
        );


        await renderGroups();

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


async function joinGroup(
    groupId
) {

    try {

        const {
            error
        } =
            await supabaseClient
                .from("group_members")
                .upsert({

                    group_id:
                        groupId,

                    user_id:
                        appState.user.id,

                    role:
                        "member"

                });


        if (error) {
            throw error;
        }


        showToast(
            "Csatlakoztál a csoporthoz.",
            "success"
        );

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


/* =========================================================
   SUBJECTS
========================================================= */

async function renderSubjects() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("subjects")
            .select("*")
            .order(
                "name"
            );


    if (error) {
        throw error;
    }


    appState.subjects =
        data || [];


    const page =
        $("#page");


    page.innerHTML = `

        <div class="page-header">

            <div>

                <h1>Tantárgyak</h1>

                <p>
                    Tantárgyak és hozzájuk kapcsolódó tananyagok.
                </p>

            </div>

        </div>


        <div class="subject-grid">

            ${
                appState.subjects.length
                ?
                appState.subjects
                    .map(subject => `

                        <article class="subject-card card">

                            <div class="subject-icon">
                                📚
                            </div>

                            <h3>
                                ${escapeHTML(
                                    subject.name
                                )}
                            </h3>

                            <p>
                                ${escapeHTML(
                                    subject.description ||
                                    "Nincs leírás."
                                )}
                            </p>

                        </article>

                    `)
                    .join("")
                :
                renderEmptyState(
                    "📚",
                    "Még nincs tantárgy",
                    "A tantárgyakat később a tanárok és adminok kezelhetik."
                )
            }

        </div>
    `;
}


/* =========================================================
   MATERIALS
========================================================= */

async function renderMaterials() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("study_materials")
            .select(`
                *,
                subjects (
                    id,
                    name
                ),
                profiles:created_by (
                    id,
                    name
                )
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {
        throw error;
    }


    appState.materials =
        data || [];


    const page =
        $("#page");


    page.innerHTML = `

        <div class="page-header">

            <div>

                <h1>Tananyagok</h1>

                <p>
                    Jegyzetek, dokumentumok és tanulási segédanyagok.
                </p>

            </div>

        </div>


        <div class="materials-list">

            ${
                appState.materials.length
                ?
                appState.materials
                    .map(renderMaterial)
                    .join("")
                :
                renderEmptyState(
                    "📖",
                    "Még nincs tananyag",
                    "A tananyagok itt fognak megjelenni."
                )
            }

        </div>
    `;
}


function renderMaterial(
    material
) {

    return `

        <article class="material-card card">

            <div class="material-icon">
                📄
            </div>


            <div class="material-content">

                <div>

                    ${
                        material.subjects
                        ?
                        `
                            <span class="subject-badge">
                                ${escapeHTML(
                                    material.subjects.name
                                )}
                            </span>
                        `
                        :
                        ""
                    }


                    <h3>
                        ${escapeHTML(
                            material.title
                        )}
                    </h3>

                    <p>
                        ${escapeHTML(
                            material.description ||
                            "Nincs leírás."
                        )}
                    </p>

                </div>


                ${
                    material.file_url
                    ?
                    `
                        <a
                            class="secondary-btn"
                            href="${escapeHTML(
                                material.file_url
                            )}"
                            target="_blank"
                            rel="noopener"
                        >
                            Megnyitás
                        </a>
                    `
                    :
                    ""
                }

            </div>

        </article>
    `;
}


/* =========================================================
   ANNOUNCEMENTS
========================================================= */

async function renderAnnouncements() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("announcements")
            .select(`
                *,
                profiles:created_by (
                    id,
                    name,
                    role,
                    avatar_url
                )
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {
        throw error;
    }


    appState.announcements =
        data || [];


    const page =
        $("#page");


    page.innerHTML = `

        <div class="page-header">

            <div>

                <h1>Iskolai hírek</h1>

                <p>
                    Fontos információk és bejelentések.
                </p>

            </div>

        </div>


        <div class="announcements-list">

            ${
                appState.announcements.length
                ?
                appState.announcements
                    .map(renderAnnouncement)
                    .join("")
                :
                renderEmptyState(
                    "📢",
                    "Még nincs iskolai hír",
                    "Az iskola hivatalos bejelentései itt jelennek meg."
                )
            }

        </div>
    `;
}


function renderAnnouncement(
    announcement
) {

    return `

        <article class="announcement-card card">

            <div class="announcement-icon">
                📢
            </div>


            <div>

                <h3>
                    ${escapeHTML(
                        announcement.title
                    )}
                </h3>

                <p>
                    ${escapeHTML(
                        announcement.body
                    )}
                </p>


                <div class="announcement-meta">

                    ${
                        announcement.profiles?.name
                        ?
                        `
                            <span>
                                ${escapeHTML(
                                    announcement.profiles.name
                                )}
                            </span>
                        `
                        :
                        ""
                    }

                    <span>
                        ${formatDate(
                            announcement.created_at
                        )}
                    </span>

                </div>

            </div>

        </article>
    `;
}


/* =========================================================
   SAVED
========================================================= */

async function renderSaved() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("saved_posts")
            .select(`
                post_id,
                posts (
                    *,
                    profiles (
                        id,
                        name,
                        class_name,
                        role,
                        avatar_url
                    )
                )
            `)
            .eq(
                "user_id",
                appState.user.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {
        throw error;
    }


    appState.savedPosts =
        (data || [])
            .map(
                item =>
                    item.posts
            )
            .filter(Boolean);


    const page =
        $("#page");


    page.innerHTML = `

        <div class="page-header">

            <div>

                <h1>Mentések</h1>

                <p>
                    Az általad elmentett bejegyzések.
                </p>

            </div>

        </div>


        ${
            appState.savedPosts.length
            ?
            appState.savedPosts
                .map(renderPost)
                .join("")
            :
            renderEmptyState(
                "🔖",
                "Nincsenek mentett bejegyzések",
                "A bejegyzések menüjéből el tudod menteni őket."
            )
        }
    `;
}


/* =========================================================
   PROFILE
========================================================= */

async function renderProfile() {

    const page =
        $("#page");


    const profile =
        appState.profile;


    if (!profile) {

        page.innerHTML =
            renderEmptyState(
                "👤",
                "Profil nem található",
                "Próbáld újra betölteni az oldalt."
            );

        return;
    }


    const {
        data: userPosts
    } =
        await supabaseClient
            .from("posts")
            .select(`
                *,
                profiles (
                    id,
                    name,
                    class_name,
                    role,
                    avatar_url
                )
            `)
            .eq(
                "author_id",
                appState.user.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    page.innerHTML = `

        <section class="profile-header card">

            <div class="profile-cover"></div>


            <div class="profile-main">

                ${avatarHTML(
                    profile,
                    "large"
                )}


                <div class="profile-info">

                    <h1>
                        ${escapeHTML(
                            profile.name
                        )}
                    </h1>


                    ${
                        profile.class_name
                        ?
                        `
                            <span>
                                ${escapeHTML(
                                    profile.class_name
                                )}
                            </span>
                        `
                        :
                        ""
                    }


                    ${
                        profile.bio
                        ?
                        `
                            <p>
                                ${escapeHTML(
                                    profile.bio
                                )}
                            </p>
                        `
                        :
                        `
                            <p class="muted">
                                Még nincs bemutatkozás.
                            </p>
                        `
                    }


                    <div class="profile-role">

                        ${
                            profile.role === "admin"
                            ?
                            "🛡️ Adminisztrátor"
                            :
                            profile.role === "teacher"
                            ?
                            "👨‍🏫 Tanár"
                            :
                            "🎓 Diák"
                        }

                    </div>

                </div>


                <button
                    class="secondary-btn"
                    type="button"
                    data-action="edit-profile"
                >
                    Profil szerkesztése
                </button>

            </div>

        </section>


        <div class="profile-section">

            <div class="section-title">

                <h2>
                    Bejegyzéseim
                </h2>

            </div>


            ${
                userPosts?.length
                ?
                userPosts
                    .map(renderPost)
                    .join("")
                :
                renderEmptyState(
                    "📝",
                    "Még nincs bejegyzésed",
                    "Ossz meg valamit a közösséggel."
                )
            }

        </div>
    `;
}


/* =========================================================
   PROFILE EDIT
========================================================= */

function openProfileEditor() {

    const profile =
        appState.profile;


    if (!profile) {
        return;
    }


    openModal(`

        <div class="modal-header">

            <h2>
                Profil szerkesztése
            </h2>

        </div>


        <form id="editProfileForm">

            <div class="form-group">

                <label for="editName">
                    Név
                </label>

                <input
                    id="editName"
                    type="text"
                    maxlength="100"
                    value="${escapeHTML(
                        profile.name || ""
                    )}"
                    required
                >

            </div>


            <div class="form-group">

                <label for="editClass">
                    Osztály
                </label>

                <input
                    id="editClass"
                    type="text"
                    maxlength="30"
                    value="${escapeHTML(
                        profile.class_name || ""
                    )}"
                >

            </div>


            <div class="form-group">

                <label for="editBio">
                    Bemutatkozás
                </label>

                <textarea
                    id="editBio"
                    rows="5"
                    maxlength="1000"
                >${escapeHTML(
                    profile.bio || ""
                )}</textarea>

            </div>


            <div class="form-group">

                <label for="editAvatar">
                    Profilkép URL
                </label>

                <input
                    id="editAvatar"
                    type="url"
                    value="${escapeHTML(
                        profile.avatar_url || ""
                    )}"
                    placeholder="https://..."
                >

            </div>


            <button
                class="primary-btn full-width"
                type="submit"
            >
                Mentés
            </button>

        </form>
    `);
}


async function updateProfile(
    event
) {

    event.preventDefault();


    const name =
        $("#editName")
            ?.value
            .trim();


    const className =
        $("#editClass")
            ?.value
            .trim() ||
        null;


    const bio =
        $("#editBio")
            ?.value
            .trim() ||
        null;


    const avatarUrl =
        $("#editAvatar")
            ?.value
            .trim() ||
        null;


    if (!name) {

        showToast(
            "A név nem lehet üres.",
            "error"
        );

        return;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("profiles")
                .update({

                    name,

                    class_name:
                        className,

                    bio,

                    avatar_url:
                        avatarUrl

                })
                .eq(
                    "id",
                    appState.user.id
                )
                .select()
                .single();


        if (error) {
            throw error;
        }


        appState.profile =
            data;


        updateProfileUI();

        closeModal();

        showToast(
            "Profil frissítve.",
            "success"
        );


        await renderProfile();

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


/* =========================================================
   NOTIFICATIONS
========================================================= */

async function renderNotifications() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("notifications")
            .select("*")
            .eq(
                "user_id",
                appState.user.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(100);


    if (error) {
        throw error;
    }


    appState.notifications =
        data || [];


    const page =
        $("#page");


    page.innerHTML = `

        <div class="page-header">

            <div>

                <h1>Értesítések</h1>

                <p>
                    Itt láthatod a neked szóló értesítéseket.
                </p>

            </div>


            ${
                appState.notifications.length
                ?
                `
                    <button
                        class="secondary-btn"
                        type="button"
                        data-action="mark-notifications-read"
                    >
                        Összes olvasottnak jelölése
                    </button>
                `
                :
                ""
            }

        </div>


        <div class="notifications-list">

            ${
                appState.notifications.length
                ?
                appState.notifications
                    .map(renderNotification)
                    .join("")
                :
                renderEmptyState(
                    "🔔",
                    "Nincs értesítés",
                    "Ha történik valami fontos, itt fog megjelenni."
                )
            }

        </div>
    `;
}


function renderNotification(
    notification
) {

    return `

        <article
            class="notification-item card ${
                notification.read
                ? ""
                : "unread"
            }"
        >

            <div class="notification-icon">
                🔔
            </div>


            <div>

                <p>
                    ${escapeHTML(
                        notification.text
                    )}
                </p>

                <small>
                    ${timeAgo(
                        notification.created_at
                    )}
                </small>

            </div>

        </article>
    `;
}


async function markNotificationsRead() {

    try {

        const {
            error
        } =
            await supabaseClient
                .from("notifications")
                .update({
                    read: true
                })
                .eq(
                    "user_id",
                    appState.user.id
                );


        if (error) {
            throw error;
        }


        showToast(
            "Értesítések olvasottnak jelölve.",
            "success"
        );


        await renderNotifications();

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


/* =========================================================
   SETTINGS
========================================================= */

async function renderSettings() {

    const page =
        $("#page");


    page.innerHTML = `

        <div class="page-header">

            <div>

                <h1>Beállítások</h1>

                <p>
                    A SZESZI alkalmazás beállításai.
                </p>

            </div>

        </div>


        <section class="settings-card card">

            <div class="settings-row">

                <div>

                    <strong>
                        Sötét mód
                    </strong>

                    <span>
                        Sötétebb megjelenés használata.
                    </span>

                </div>


                <label class="switch">

                    <input
                        type="checkbox"
                        id="darkModeToggle"
                        ${
                            appState.darkMode
                            ? "checked"
                            : ""
                        }
                    >

                    <span class="slider"></span>

                </label>

            </div>


            <div class="settings-row">

                <div>

                    <strong>
                        Fiók
                    </strong>

                    <span>
                        ${escapeHTML(
                            appState.user?.email ||
                            ""
                        )}
                    </span>

                </div>


                <button
                    class="danger-btn"
                    type="button"
                    data-action="logout"
                >
                    Kijelentkezés
                </button>

            </div>

        </section>
    `;
}


/* =========================================================
   ADMIN
========================================================= */

async function renderAdmin() {

    if (
        ![
            "admin",
            "teacher"
        ].includes(
            appState.profile?.role
        )
    ) {

        const page =
            $("#page");


        page.innerHTML =
            renderEmptyState(
                "🛡️",
                "Nincs hozzáférés",
                "Ehhez a felülethez nincs megfelelő jogosultságod."
            );

        return;
    }


    const page =
        $("#page");


    page.innerHTML = `

        <div class="page-header">

            <div>

                <h1>Adminisztráció</h1>

                <p>
                    Iskolai tartalmak és közösségi funkciók kezelése.
                </p>

            </div>

        </div>


        <section class="admin-grid">

            <article class="admin-card card">

                <div class="admin-icon">
                    📢
                </div>

                <h3>
                    Iskolai hír
                </h3>

                <p>
                    Új hivatalos bejelentés közzététele.
                </p>

                <button
                    class="primary-btn"
                    type="button"
                    data-action="open-announcement-modal"
                >
                    Új hír
                </button>

            </article>


            <article class="admin-card card">

                <div class="admin-icon">
                    📚
                </div>

                <h3>
                    Tantárgy
                </h3>

                <p>
                    Új tantárgy hozzáadása.
                </p>

                <button
                    class="primary-btn"
                    type="button"
                    data-action="open-subject-modal"
                >
                    Új tantárgy
                </button>

            </article>


            <article class="admin-card card">

                <div class="admin-icon">
                    📖
                </div>

                <h3>
                    Tananyag
                </h3>

                <p>
                    Tananyag vagy dokumentum hozzáadása.
                </p>

                <button
                    class="primary-btn"
                    type="button"
                    data-action="open-material-modal"
                >
                    Új tananyag
                </button>

            </article>

        </section>
    `;
}


/* =========================================================
   ADMIN – ANNOUNCEMENT
========================================================= */

function openAnnouncementModal() {

    openModal(`

        <div class="modal-header">

            <h2>
                Új iskolai hír
            </h2>

        </div>


        <form id="createAnnouncementForm">

            <div class="form-group">

                <label for="announcementTitle">
                    Cím
                </label>

                <input
                    id="announcementTitle"
                    type="text"
                    maxlength="200"
                    required
                >

            </div>


            <div class="form-group">

                <label for="announcementBody">
                    Tartalom
                </label>

                <textarea
                    id="announcementBody"
                    rows="8"
                    maxlength="10000"
                    required
                ></textarea>

            </div>


            <button
                class="primary-btn full-width"
                type="submit"
            >
                Hír közzététele
            </button>

        </form>
    `);
}


async function createAnnouncement(
    event
) {

    event.preventDefault();


    const title =
        $("#announcementTitle")
            ?.value
            .trim();


    const body =
        $("#announcementBody")
            ?.value
            .trim();


    if (!title || !body) {
        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("announcements")
                .insert({

                    title,

                    body,

                    created_by:
                        appState.user.id

                });


        if (error) {
            throw error;
        }


        closeModal();

        showToast(
            "Hír közzétéve.",
            "success"
        );

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


/* =========================================================
   ADMIN – SUBJECT
========================================================= */

function openSubjectModal() {

    openModal(`

        <div class="modal-header">

            <h2>
                Új tantárgy
            </h2>

        </div>


        <form id="createSubjectForm">

            <div class="form-group">

                <label for="subjectName">
                    Tantárgy neve
                </label>

                <input
                    id="subjectName"
                    type="text"
                    maxlength="150"
                    required
                >

            </div>


            <div class="form-group">

                <label for="subjectDescription">
                    Leírás
                </label>

                <textarea
                    id="subjectDescription"
                    rows="5"
                    maxlength="2000"
                ></textarea>

            </div>


            <button
                class="primary-btn full-width"
                type="submit"
            >
                Tantárgy létrehozása
            </button>

        </form>
    `);
}


async function createSubject(
    event
) {

    event.preventDefault();


    const name =
        $("#subjectName")
            ?.value
            .trim();


    const description =
        $("#subjectDescription")
            ?.value
            .trim() ||
        null;


    if (!name) {
        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("subjects")
                .insert({

                    name,

                    description

                });


        if (error) {
            throw error;
        }


        closeModal();

        showToast(
            "Tantárgy létrehozva.",
            "success"
        );

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


/* =========================================================
   ADMIN – MATERIAL
========================================================= */

function openMaterialModal() {

    const subjects =
        appState.subjects || [];


    openModal(`

        <div class="modal-header">

            <h2>
                Új tananyag
            </h2>

        </div>


        <form id="createMaterialForm">

            <div class="form-group">

                <label for="materialTitle">
                    Cím
                </label>

                <input
                    id="materialTitle"
                    type="text"
                    maxlength="200"
                    required
                >

            </div>


            <div class="form-group">

                <label for="materialSubject">
                    Tantárgy
                </label>

                <select
                    id="materialSubject"
                >

                    <option value="">
                        Nincs megadva
                    </option>

                    ${
                        subjects.map(
                            subject => `
                                <option value="${subject.id}">
                                    ${escapeHTML(
                                        subject.name
                                    )}
                                </option>
                            `
                        ).join("")
                    }

                </select>

            </div>


            <div class="form-group">

                <label for="materialDescription">
                    Leírás
                </label>

                <textarea
                    id="materialDescription"
                    rows="5"
                    maxlength="3000"
                ></textarea>

            </div>


            <div class="form-group">

                <label for="materialUrl">
                    Fájl URL
                </label>

                <input
                    id="materialUrl"
                    type="url"
                    placeholder="https://..."
                >

            </div>


            <button
                class="primary-btn full-width"
                type="submit"
            >
                Tananyag hozzáadása
            </button>

        </form>
    `);
}


async function createMaterial(
    event
) {

    event.preventDefault();


    const title =
        $("#materialTitle")
            ?.value
            .trim();


    const subjectId =
        $("#materialSubject")
            ?.value ||
        null;


    const description =
        $("#materialDescription")
            ?.value
            .trim() ||
        null;


    const fileUrl =
        $("#materialUrl")
            ?.value
            .trim() ||
        null;


    if (!title) {
        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("study_materials")
                .insert({

                    title,

                    subject_id:
                        subjectId,

                    description,

                    file_url:
                        fileUrl,

                    created_by:
                        appState.user.id

                });


        if (error) {
            throw error;
        }


        closeModal();

        showToast(
            "Tananyag hozzáadva.",
            "success"
        );

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(error),
            "error"
        );
    }
}


/* =========================================================
   SEARCH
========================================================= */

async function performSearch(
    term
) {

    term =
        String(term || "")
            .trim();


    if (!term) {
        return;
    }


    appState.searchTerm =
        term;


    const page =
        $("#page");


    page.innerHTML = `

        <div class="page-header">

            <div>

                <h1>Keresés</h1>

                <p>
                    Találatok erre: <strong>${escapeHTML(
                        term
                    )}</strong>
                </p>

            </div>

        </div>


        <div class="search-results">

            <div class="loading-state">
                Keresés...
            </div>

        </div>
    `;


    const [
        postsResult,
        questionsResult,
        profilesResult
    ] =
        await Promise.all([

            supabaseClient
                .from("posts")
                .select(`
                    *,
                    profiles (
                        id,
                        name,
                        class_name,
                        avatar_url
                    )
                `)
                .ilike(
                    "body",
                    `%${term}%`
                )
                .limit(20),


            supabaseClient
                .from("questions")
                .select(`
                    *,
                    profiles (
                        id,
                        name,
                        class_name,
                        avatar_url
                    )
                `)
                .or(
                    `title.ilike.%${term}%,body.ilike.%${term}%`
                )
                .limit(20),


            supabaseClient
                .from("profiles")
                .select(`
                    id,
                    name,
                    class_name,
                    role,
                    avatar_url
                `)
                .ilike(
                    "name",
                    `%${term}%`
                )
                .limit(20)

        ]);


    const results =
        $(".search-results");


    if (!results) {
        return;
    }


    const posts =
        postsResult.data || [];


    const questions =
        questionsResult.data || [];


    const profiles =
        profilesResult.data || [];


    results.innerHTML = `

        <section class="search-section">

            <h2>
                Felhasználók
            </h2>


            ${
                profiles.length
                ?
                profiles.map(
                    user => `

                        <article
                            class="search-user card"
                        >

                            ${avatarHTML(
                                user,
                                "small"
                            )}

                            <div>

                                <strong>
                                    ${escapeHTML(
                                        user.name
                                    )}
                                </strong>

                                <span>
                                    ${
                                        user.class_name
                                        ?
                                        escapeHTML(
                                            user.class_name
                                        )
                                        :
                                        ""
                                    }
                                </span>

                            </div>

                        </article>

                    `
                ).join("")
                :
                `<p class="muted">
                    Nincs felhasználói találat.
                </p>`
            }

        </section>


        <section class="search-section">

            <h2>
                Bejegyzések
            </h2>


            ${
                posts.length
                ?
                posts.map(
                    renderPost
                ).join("")
                :
                `<p class="muted">
                    Nincs bejegyzés találat.
                </p>`
            }

        </section>


        <section class="search-section">

            <h2>
                Kérdések
            </h2>


            ${
                questions.length
                ?
                questions.map(
                    renderQuestion
                ).join("")
                :
                `<p class="muted">
                    Nincs kérdés találat.
                </p>`
            }

        </section>
    `;
}


/* =========================================================
   EMPTY STATE
========================================================= */

function renderEmptyState(
    icon,
    title,
    text
) {

    return `

        <div class="empty-state">

            <div class="empty-icon">
                ${icon}
            </div>

            <h3>
                ${escapeHTML(
                    title
                )}
            </h3>

            <p>
                ${escapeHTML(
                    text
                )}
            </p>

        </div>
    `;
}


/* =========================================================
   DARK MODE
========================================================= */

function loadTheme() {

    const saved =
        localStorage.getItem(
            "szeszi-theme"
        );


    appState.darkMode =
        saved === "dark";


    applyTheme();
}


function applyTheme() {

    document.body.classList.toggle(
        "dark-mode",
        appState.darkMode
    );


    localStorage.setItem(
        "szeszi-theme",
        appState.darkMode
            ? "dark"
            : "light"
    );
}


function toggleDarkMode(
    checked
) {

    appState.darkMode =
        Boolean(checked);


    applyTheme();
}


/* =========================================================
   EVENT DELEGATION
========================================================= */

function bindEvents() {


    /* ---------------------------------------------
       LOGIN
    --------------------------------------------- */

    $("#loginForm")?.addEventListener(
        "submit",
        handleLogin
    );


    /* ---------------------------------------------
       REGISTER
    --------------------------------------------- */

    $("#registerForm")?.addEventListener(
        "submit",
        handleRegister
    );


    /* ---------------------------------------------
       AUTH SWITCH
    --------------------------------------------- */

    $("#showRegister")?.addEventListener(
        "click",
        showRegister
    );


    $("#showLogin")?.addEventListener(
        "click",
        showLogin
    );


    /* ---------------------------------------------
       MOBILE MENU
    --------------------------------------------- */

    $("#menuBtn")?.addEventListener(
        "click",
        toggleSidebar
    );


    /* ---------------------------------------------
       NAVIGATION
    --------------------------------------------- */

    document.addEventListener(
        "click",
        event => {

            const viewButton =
                event.target.closest(
                    "[data-view]"
                );


            if (
                viewButton &&
                !viewButton.id?.includes(
                    "topAvatar"
                )
            ) {

                const view =
                    viewButton.dataset.view;


                if (view) {

                    event.preventDefault();

                    navigate(view);
                }
            }
        }
    );


    /* ---------------------------------------------
       ACTIONS
    --------------------------------------------- */

    document.addEventListener(
        "click",
        async event => {

            const button =
                event.target.closest(
                    "[data-action]"
                );


            if (!button) {
                return;
            }


            const action =
                button.dataset.action;


            const id =
                button.dataset.id;


            try {

                switch (action) {

                    case "open-post-modal":
                        openPostModal();
                        break;


                    case "like-post":
                        await toggleLike(id);
                        break;


                    case "open-comments":
                        await loadComments(id);
                        break;


                    case "save-post":
                        await toggleSavePost(id);
                        break;


                    case "share-post":
                        await sharePost(id);
                        break;


                    case "open-question-modal":
                        openQuestionModal();
                        break;


                    case "open-question":
                        await openQuestion(id);
                        break;


                    case "new-message":
                        await openNewMessageModal();
                        break;


                    case "start-chat":
                        await startPrivateChat(id);
                        break;


                    case "open-conversation":
                        await openConversation(id);
                        break;


                    case "open-group-modal":
                        openGroupModal();
                        break;


                    case "join-group":
                        await joinGroup(id);
                        break;


                    case "edit-profile":
                        openProfileEditor();
                        break;


                    case "logout":
                        await logout();
                        break;


                    case "mark-notifications-read":
                        await markNotificationsRead();
                        break;


                    case "open-announcement-modal":
                        openAnnouncementModal();
                        break;


                    case "open-subject-modal":
                        openSubjectModal();
                        break;


                    case "open-material-modal":
                        openMaterialModal();
                        break;

                }

            } catch (error) {

                console.error(
                    "Action error:",
                    error
                );

                showToast(
                    getErrorMessage(error),
                    "error"
                );
            }
        }
    );


    /* ---------------------------------------------
       FORMOK
    --------------------------------------------- */

    document.addEventListener(
        "submit",
        async event => {

            const form =
                event.target;


            if (
                form.id ===
                "createPostForm"
            ) {

                await createPost(event);

                return;
            }


            if (
                form.matches(
                    "[data-comment-form]"
                )
            ) {

                await createComment(
                    event,
                    form.dataset.commentForm
                );

                return;
            }


            if (
                form.id ===
                "createQuestionForm"
            ) {

                await createQuestion(
                    event
                );

                return;
            }


            if (
                form.id ===
                "answerQuestionForm"
            ) {

                await createAnswer(
                    event
                );

                return;
            }


            if (
                form.id ===
                "messageForm"
            ) {

                await sendMessage(
                    event
                );

                return;
            }


            if (
                form.id ===
                "createGroupForm"
            ) {

                await createGroup(
                    event
                );

                return;
            }


            if (
                form.id ===
                "editProfileForm"
            ) {

                await updateProfile(
                    event
                );

                return;
            }


            if (
                form.id ===
                "createAnnouncementForm"
            ) {

                await createAnnouncement(
                    event
                );

                return;
            }


            if (
                form.id ===
                "createSubjectForm"
            ) {

                await createSubject(
                    event
                );

                return;
            }


            if (
                form.id ===
                "createMaterialForm"
            ) {

                await createMaterial(
                    event
                );

                return;
            }
        }
    );


    /* ---------------------------------------------
       DARK MODE
    --------------------------------------------- */

    document.addEventListener(
        "change",
        event => {

            if (
                event.target.id ===
                "darkModeToggle"
            ) {

                toggleDarkMode(
                    event.target.checked
                );
            }
        }
    );


    /* ---------------------------------------------
       GLOBAL SEARCH
    --------------------------------------------- */

    $("#globalSearch")?.addEventListener(
        "keydown",
        event => {

            if (
                event.key !==
                "Enter"
            ) {
                return;
            }


            const term =
                event.target.value.trim();


            if (!term) {
                return;
            }


            event.preventDefault();

            performSearch(term);
        }
    );
}


/* =========================================================
   REALTIME NOTIFICATIONS
========================================================= */

function subscribeToNotifications() {

    if (
        !supabaseClient ||
        !appState.user
    ) {
        return;
    }


    if (
        appState.notificationsChannel
    ) {

        supabaseClient.removeChannel(
            appState.notificationsChannel
        );
    }


    appState.notificationsChannel =
        supabaseClient
            .channel(
                `notifications-${appState.user.id}`
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter:
                        `user_id=eq.${appState.user.id}`
                },
                payload => {

                    showToast(
                        `🔔 ${payload.new.text}`,
                        "info"
                    );
                }
            )
            .subscribe();
}


/* =========================================================
   AUTH STATE
========================================================= */

async function handleAuthState(
    session
) {

    if (!session?.user) {

        appState.user = null;
        appState.profile = null;

        showAuthScreen();

        return;
    }


    appState.user =
        session.user;


    await ensureProfile();

    updateProfileUI();

    showMainApp();

    subscribeToNotifications();

    await navigate(
        appState.currentView ||
        "home"
    );
}


/* =========================================================
   SUPABASE INDÍTÁS
========================================================= */

async function initializeSupabase() {

    if (!supabaseClient) {

        showAuthScreen();

        const authContainer =
            document.querySelector(
                ".auth-container"
            );


        if (authContainer) {

            authContainer.innerHTML = `

                <div class="auth-brand">

                    <div class="auth-logo">
                        S
                    </div>

                    <h1>
                        SZESZI
                    </h1>

                    <p>
                        Szigeti Endre Technikum
                    </p>

                </div>


                <div class="auth-card">

                    <div class="auth-header">

                        <h2>
                            Supabase beállítása szükséges
                        </h2>

                        <p>
                            Az alkalmazás frontendje elkészült,
                            de még nincs megadva a Supabase URL
                            és az anon/publishable kulcs.
                        </p>

                    </div>


                    <div class="setup-info">

                        <p>
                            Nyisd meg a
                            <strong>
                                supabase-config.js
                            </strong>
                            fájlt.
                        </p>

                        <p>
                            A következő két értéket kell kitölteni:
                        </p>

                        <pre>{
  url: "A_SUPABASE_URL",
  anonKey: "A_SUPABASE_ANON_KULCS"
}</pre>

                        <p>
                            A titkos
                            <strong>
                                service_role
                            </strong>
                            kulcsot soha ne tedd ebbe a fájlba.
                        </p>

                    </div>

                </div>
            `;

        }

        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient.auth.getSession();


    if (error) {

        console.error(error);

        showToast(
            getErrorMessage(error),
            "error"
        );

        showAuthScreen();

        return;
    }


    await handleAuthState(
        data.session
    );


    supabaseClient.auth.onAuthStateChange(
        async (
            _event,
            session
        ) => {

            /*
             * A Supabase callback közben
             * nem végzünk túl sok műveletet.
             */

            setTimeout(
                () =>
                    handleAuthState(
                        session
                    ),
                0
            );
        }
    );
}


/* =========================================================
   SERVICE WORKER
========================================================= */

function registerServiceWorker() {

    if (
        !("serviceWorker" in navigator)
    ) {
        return;
    }


    if (
        location.protocol !==
        "https:" &&
        location.hostname !==
        "localhost"
    ) {
        return;
    }


    navigator.serviceWorker
        .register(
            "./sw.js"
        )
        .then(
            registration => {

                console.log(
                    "SZESZI Service Worker:",
                    registration.scope
                );

            }
        )
        .catch(
            error => {

                console.warn(
                    "Service Worker hiba:",
                    error
                );

            }
        );
}


/* =========================================================
   ALKALMAZÁS INDÍTÁSA
========================================================= */

async function init() {

    loadTheme();

    bindModalClose();

    bindEvents();

    showLogin();

    await initializeSupabase();

    registerServiceWorker();
}


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);
