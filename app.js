(/* =========================================================
   SZESZI
   Szigeti Endre Technikum
   Fő alkalmazás JavaScript
========================================================= */

"use strict";


/* =========================================================
   ÁLLAPOT
========================================================= */

const appState = {

    currentView: "home",

    currentUser: null,

    currentChat: null,

    searchTerm: "",

    notifications: [],

    isLoading: false

};


/* =========================================================
   SEGÉDFÜGGVÉNYEK
========================================================= */

function $(selector) {
    return document.querySelector(selector);
}


function $$(selector) {
    return document.querySelectorAll(selector);
}


function escapeHTML(value = "") {

    const element = document.createElement("div");

    element.textContent = String(value);

    return element.innerHTML;

}


function showToast(message, type = "normal") {

    const toast = $("#toast");

    if (!toast) {
        return;
    }

    toast.className = `toast ${type}`;

    toast.textContent = message;

    clearTimeout(window.__szesziToast);

    window.__szesziToast = setTimeout(() => {

        toast.className = "toast";

        toast.textContent = "";

    }, 3000);

}


function setLoading(loading) {

    appState.isLoading = loading;

    document.body.classList.toggle(
        "is-loading",
        loading
    );

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

    document.body.classList.add("modal-open");

}


function closeModal() {

    const modal = $("#modal");

    if (!modal) {
        return;
    }

    modal.hidden = true;

    document.body.classList.remove("modal-open");

}


/* =========================================================
   AUTH FELÜLET
========================================================= */

function showLogin() {

    const login = $("#loginView");

    const register = $("#registerView");

    if (login) {
        login.hidden = false;
    }

    if (register) {
        register.hidden = true;
    }

}


function showRegister() {

    const login = $("#loginView");

    const register = $("#registerView");

    if (login) {
        login.hidden = true;
    }

    if (register) {
        register.hidden = false;
    }

}


/* =========================================================
   AUTH KÉPERNYŐ
========================================================= */

function showAuthScreen() {

    const authScreen = $("#authScreen");

    const mainApp = $("#mainApp");

    if (authScreen) {
        authScreen.hidden = false;
    }

    if (mainApp) {
        mainApp.hidden = true;
    }

}


/* =========================================================
   FŐ ALKALMAZÁS
========================================================= */

function showMainApp() {

    const authScreen = $("#authScreen");

    const mainApp = $("#mainApp");

    if (authScreen) {
        authScreen.hidden = true;
    }

    if (mainApp) {
        mainApp.hidden = false;
    }

}


/* =========================================================
   SUPABASE ELLENŐRZÉS
========================================================= */

function isSupabaseReady() {

    if (
        typeof window.SZESZI_SUPABASE === "undefined"
    ) {

        return false;

    }

    if (
        !window.SZESZI_SUPABASE.url ||
        !window.SZESZI_SUPABASE.anonKey
    ) {

        return false;

    }

    return true;

}


/* =========================================================
   SUPABASE KLIENS
========================================================= */

let supabaseClient = null;


async function initializeSupabase() {

    if (!isSupabaseReady()) {

        console.warn(
            "A Supabase még nincs beállítva."
        );

        return false;

    }


    if (
        typeof window.supabase === "undefined"
    ) {

        console.error(
            "A Supabase könyvtár nem töltődött be."
        );

        return false;

    }


    try {

        supabaseClient =
            window.supabase.createClient(
                window.SZESZI_SUPABASE.url,
                window.SZESZI_SUPABASE.anonKey
            );

        return true;

    } catch (error) {

        console.error(
            "Supabase inicializálási hiba:",
            error
        );

        return false;

    }

}


/* =========================================================
   AUTH ÁLLAPOT LEKÉRÉSE
========================================================= */

async function checkAuth() {

    if (!supabaseClient) {

        showAuthScreen();

        return;

    }


    try {

        const {
            data,
            error
        } = await supabaseClient.auth.getSession();


        if (error) {

            console.error(
                "Session hiba:",
                error
            );

            showAuthScreen();

            return;

        }


        if (
            data &&
            data.session &&
            data.session.user
        ) {

            await loadCurrentUser(
                data.session.user
            );

            showMainApp();

            await initializeApplication();

        } else {

            showAuthScreen();

        }

    } catch (error) {

        console.error(
            "Auth ellenőrzési hiba:",
            error
        );

        showAuthScreen();

    }

}


/* =========================================================
   JELENLEGI FELHASZNÁLÓ BETÖLTÉSE
========================================================= */

async function loadCurrentUser(authUser) {

    if (!supabaseClient || !authUser) {

        return null;

    }


    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle();


        if (error) {

            console.error(
                "Profil betöltési hiba:",
                error
            );

            return null;

        }


        if (data) {

            appState.currentUser = data;

            updateUserInterface();

            return data;

        }


        /*
         * Ha az auth felhasználóhoz még nincs profil,
         * később itt lehet létrehozni.
         */

        appState.currentUser = {

            id: authUser.id,

            name:
                authUser.user_metadata?.name ||
                "Felhasználó",

            email: authUser.email || "",

            role: "student",

            class_name: "",

            bio: "",

            avatar_url: ""

        };


        updateUserInterface();

        return appState.currentUser;

    } catch (error) {

        console.error(
            "Profil feldolgozási hiba:",
            error
        );

        return null;

    }

}


/* =========================================================
   FELHASZNÁLÓI FELÜLET FRISSÍTÉSE
========================================================= */

function updateUserInterface() {

    const user = appState.currentUser;

    if (!user) {
        return;
    }


    const avatar = $("#topAvatar");

    if (avatar) {

        if (user.avatar_url) {

            avatar.innerHTML = `
                <img
                    src="${escapeHTML(user.avatar_url)}"
                    alt="Profilkép"
                >
            `;

        } else {

            avatar.textContent =
                getInitials(
                    user.name
                );

        }

    }


    const adminNav = $("#adminNav");

    if (adminNav) {

        adminNav.hidden =
            user.role !== "admin";

    }

}


/* =========================================================
   MONOGRAM
========================================================= */

function getInitials(name = "") {

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
            .substring(0, 2)
            .toUpperCase();

    }


    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();

}


/* =========================================================
   BEJELENTKEZÉS
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
            "Töltsd ki az összes mezőt.",
            "error"
        );

        return;

    }


    setLoading(true);


    try {

        const {
            data,
            error
        } = await supabaseClient.auth.signInWithPassword({

            email,

            password

        });


        if (error) {

            console.error(
                "Bejelentkezési hiba:",
                error
            );

            showToast(
                translateAuthError(error),
                "error"
            );

            return;

        }


        if (
            data &&
            data.user
        ) {

            await loadCurrentUser(
                data.user
            );

            showMainApp();

            await initializeApplication();

            showToast(
                "Sikeres bejelentkezés."
            );

        }

    } catch (error) {

        console.error(error);

        showToast(
            "Hiba történt a bejelentkezés során.",
            "error"
        );

    } finally {

        setLoading(false);

    }

}


/* =========================================================
   REGISZTRÁCIÓ
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


    const className =
        $("#registerClass")?.value.trim();


    const role =
        $("#registerRole")?.value || "student";


    const password =
        $("#registerPassword")?.value;


    const passwordConfirm =
        $("#registerPasswordConfirm")?.value;


    if (
        !name ||
        !email ||
        !className ||
        !password ||
        !passwordConfirm
    ) {

        showToast(
            "Töltsd ki az összes mezőt.",
            "error"
        );

        return;

    }


    if (password.length < 8) {

        showToast(
            "A jelszónak legalább 8 karakteresnek kell lennie.",
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


    setLoading(true);


    try {

        /*
         * A kliensből nem engedjük,
         * hogy valaki admin szerepkört adjon magának.
         */

        const safeRole =
            role === "teacher"
                ? "teacher"
                : "student";


        const {
            data,
            error
        } = await supabaseClient.auth.signUp({

            email,

            password,

            options: {

                data: {

                    name,

                    class_name: className,

                    role: safeRole

                }

            }

        });


        if (error) {

            console.error(
                "Regisztrációs hiba:",
                error
            );

            showToast(
                translateAuthError(error),
                "error"
            );

            return;

        }


        if (
            data &&
            data.user
        ) {

            /*
             * A profil létrehozását az adatbázis
             * trigger fogja kezelni.
             */

            showToast(
                "A regisztráció sikeres. Ellenőrizd az e-mail-címedet, ha szükséges."
            );

            showLogin();

            const loginEmail =
                $("#loginEmail");

            if (loginEmail) {

                loginEmail.value = email;

            }

        }

    } catch (error) {

        console.error(error);

        showToast(
            "Hiba történt a regisztráció során.",
            "error"
        );

    } finally {

        setLoading(false);

    }

}


/* =========================================================
   AUTH HIBÁK MAGYARÍTÁSA
========================================================= */

function translateAuthError(error) {

    const message =
        String(
            error?.message || ""
        ).toLowerCase();


    if (
        message.includes(
            "invalid login credentials"
        )
    ) {

        return "Helytelen e-mail-cím vagy jelszó.";

    }


    if (
        message.includes(
            "email not confirmed"
        )
    ) {

        return "Az e-mail-címed még nincs megerősítve.";

    }


    if (
        message.includes(
            "user already registered"
        )
    ) {

        return "Ezzel az e-mail-címmel már létezik fiók.";

    }


    if (
        message.includes(
            "password"
        ) &&
        message.includes(
            "8"
        )
    ) {

        return "A jelszónak legalább 8 karakteresnek kell lennie.";

    }


    return (
        error?.message ||
        "Ismeretlen hiba történt."
    );

}


/* =========================================================
   KIJELENTKEZÉS
========================================================= */

async function logout() {

    if (!supabaseClient) {
        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient.auth.signOut();


        if (error) {

            console.error(
                "Kijelentkezési hiba:",
                error
            );

            return;

        }


        appState.currentUser = null;

        appState.currentChat = null;

        showAuthScreen();

        showLogin();

        showToast(
            "Sikeresen kijelentkeztél."
        );

    } catch (error) {

        console.error(error);

    }

}


/* =========================================================
   OLDALSÁV
========================================================= */

function toggleSidebar() {

    const sidebar = $("#sidebar");

    if (!sidebar) {
        return;
    }

    sidebar.classList.toggle("open");

}


function closeSidebar() {

    const sidebar = $("#sidebar");

    if (!sidebar) {
        return;
    }

    sidebar.classList.remove("open");

}


/* =========================================================
   NAVIGÁCIÓ
========================================================= */

async function navigate(view) {

    if (!view) {
        return;
    }


    if (
        view === "admin" &&
        appState.currentUser?.role !== "admin"
    ) {

        showToast(
            "Ehhez a felülethez nincs jogosultságod.",
            "error"
        );

        return;

    }


    appState.currentView = view;

    closeSidebar();

    updateNavigation();

    await renderCurrentView();

}


/* =========================================================
   NAVIGÁCIÓ AKTÍV ÁLLAPOT
========================================================= */

function updateNavigation() {

    $$(".nav-item").forEach(item => {

        item.classList.toggle(
            "active",
            item.dataset.view ===
                appState.currentView
        );

    });


    $$(".mobile-bottom-nav [data-view]")
        .forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.view ===
                    appState.currentView
            );

        });

}


/* =========================================================
   FŐ OLDAL RENDER
========================================================= */

async function renderCurrentView() {

    const page = $("#page");

    if (!page) {
        return;
    }


    setLoading(true);


    try {

        switch (
            appState.currentView
        ) {

            case "home":

                await renderHome(page);

                break;


            case "questions":

                await renderQuestions(page);

                break;


            case "messages":

                await renderMessages(page);

                break;


            case "groups":

                await renderGroups(page);

                break;


            case "subjects":

                await renderSubjects(page);

                break;


            case "materials":

                await renderMaterials(page);

                break;


            case "announcements":

                await renderAnnouncements(page);

                break;


            case "saved":

                await renderSaved(page);

                break;


            case "profile":

                await renderProfile(page);

                break;


            case "notifications":

                await renderNotifications(page);

                break;


            case "settings":

                await renderSettings(page);

                break;


            case "admin":

                await renderAdmin(page);

                break;


            case "search":

                await renderSearch(page);

                break;


            default:

                await renderHome(page);

        }

    } catch (error) {

        console.error(
            "Oldal megjelenítési hiba:",
            error
        );


        page.innerHTML = `

            <div class="card">

                <h2>
                    Hiba történt
                </h2>

                <p class="muted">
                    Az oldal betöltése közben hiba történt.
                </p>

            </div>

        `;

    } finally {

        setLoading(false);

    }

}


/* =========================================================
   OLDAL FEJLÉC
========================================================= */

function pageHeader(
    title,
    description = "",
    button = ""
) {

    return `

        <div class="page-head">

            <div>

                <h1>
                    ${escapeHTML(title)}
                </h1>

                ${
                    description
                        ? `
                            <div class="muted">
                                ${escapeHTML(description)}
                            </div>
                        `
                        : ""
                }

            </div>

            ${
                button
                    ? button
                    : ""
            }

        </div>

    `;

}


/* =========================================================
   KEZDŐLAP
========================================================= */

async function renderHome(page) {

    page.innerHTML = `

        ${pageHeader(
            "Kezdőlap",
            "Az iskola közösségi felülete.",
            `
                <button
                    type="button"
                    class="btn"
                    data-create-post
                >
                    ＋ Bejegyzés
                </button>
            `
        )}


        <div class="card composer">

            <span
                id="composerAvatar"
                class="avatar"
            >
                ?
            </span>

            <input
                type="text"
                placeholder="Mi újság?"
                data-create-post
                readonly
            >

            <button
                type="button"
                class="btn secondary"
                data-create-post
            >
                Írás
            </button>

        </div>


        <div
            id="feed"
            class="feed"
        >

            <div class="card empty">

                <p>
                    Még nincsenek bejegyzések.
                </p>

                <p class="muted">
                    Legyél az első, aki megoszt valamit az iskolai közösséggel!
                </p>

            </div>

        </div>

    `;


    updateComposerAvatar();


    if (!supabaseClient) {
        return;
    }


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("posts")

            .select(`
                id,
                body,
                image_url,
                created_at,
                author_id,
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
            );


        if (error) {

            console.error(
                "Bejegyzések betöltési hiba:",
                error
            );

            return;

        }


        const feed =
            $("#feed");


        if (!feed) {
            return;
        }


        if (!data || !data.length) {

            return;

        }


        feed.innerHTML =
            data
                .map(
                    renderPost
                )
                .join("");


        await loadPostInteractions();

    } catch (error) {

        console.error(error);

    }

}


/* =========================================================
   COMPOSER AVATAR
========================================================= */

function updateComposerAvatar() {

    const avatar =
        $("#composerAvatar");


    if (!avatar) {
        return;
    }


    const user =
        appState.currentUser;


    if (!user) {

        avatar.textContent = "?";

        return;

    }


    if (user.avatar_url) {

        avatar.innerHTML = `

            <img
                src="${escapeHTML(user.avatar_url)}"
                alt="Profilkép"
            >

        `;

    } else {

        avatar.textContent =
            getInitials(
                user.name
            );

    }

}


/* =========================================================
   POST HTML
========================================================= */

function renderPost(post) {

    const author =
        post.profiles || {};


    const avatar =
        author.avatar_url

            ? `
                <img
                    src="${escapeHTML(author.avatar_url)}"
                    alt="Profilkép"
                >
            `

            : escapeHTML(
                getInitials(
                    author.name || "?"
                )
            );


    const date =
        formatDate(
            post.created_at
        );


    return `

        <article
            class="card post"
            data-post-id="${escapeHTML(post.id)}"
        >


            <div class="post-head">

                <div class="avatar">

                    ${avatar}

                </div>


                <div class="post-meta">

                    <b>
                        ${escapeHTML(
                            author.name ||
                            "Ismeretlen felhasználó"
                        )}
                    </b>

                    <span>

                        ${escapeHTML(
                            author.class_name ||
                            ""
                        )}

                        ${
                            author.class_name
                                ? " · "
                                : ""
                        }

                        ${escapeHTML(date)}

                    </span>

                </div>

            </div>


            <div class="post-body">

                ${escapeHTML(
                    post.body
                )}

            </div>


            ${
                post.image_url

                    ? `

                        <img
                            class="post-image"
                            src="${escapeHTML(post.image_url)}"
                            alt="Bejegyzés képe"
                            loading="lazy"
                        >

                    `

                    : ""
            }


            <div class="post-actions">

                <button
                    type="button"
                    class="action"
                    data-like-post="${escapeHTML(post.id)}"
                >
                    ❤️
                    <span data-like-count>
                        0
                    </span>
                </button>


                <button
                    type="button"
                    class="action"
                    data-comment-post="${escapeHTML(post.id)}"
                >
                    💬
                    <span>
                        Hozzászólás
                    </span>
                </button>


                <button
                    type="button"
                    class="action"
                    data-share-post="${escapeHTML(post.id)}"
                >
                    ↗
                    <span>
                        Megosztás
                    </span>
                </button>


                <button
                    type="button"
                    class="action"
                    data-save-post="${escapeHTML(post.id)}"
                >
                    🔖
                </button>

            </div>


            <div
                class="comments"
                data-comments="${escapeHTML(post.id)}"
            ></div>


        </article>

    `;

}


/* =========================================================
   DÁTUM FORMÁZÁSA
========================================================= */

function formatDate(dateValue) {

    if (!dateValue) {
        return "";
    }


    const date =
        new Date(dateValue);


    if (Number.isNaN(
        date.getTime()
    )) {

        return "";

    }


    return date.toLocaleString(
        "hu-HU",
        {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


/* =========================================================
   POST INTERAKCIÓK
========================================================= */

async function loadPostInteractions() {

    if (!supabaseClient) {
        return;
    }


    /*
     * A tényleges reakciók és kommentek
     * a Supabase-ből kerülnek majd ide.
     *
     * A funkció azért külön van választva,
     * hogy később könnyen bővíthető legyen.
     */

}


/* =========================================================
   BEJEGYZÉS LÉTREHOZÁSA
========================================================= */

function openCreatePost() {

    if (!appState.currentUser) {

        showToast(
            "A bejegyzés létrehozásához be kell jelentkezned.",
            "error"
        );

        return;

    }


    openModal(`

        <h2>
            Új bejegyzés
        </h2>


        <form
            id="createPostForm"
            class="form"
        >


            <div class="form-group">

                <label for="postBody">
                    Bejegyzés
                </label>

                <textarea
                    id="postBody"
                    placeholder="Mit szeretnél megosztani az iskolai közösséggel?"
                    required
                ></textarea>

            </div>


            <div class="form-group">

                <label for="postImageUrl">
                    Kép URL
                </label>

                <input
                    type="url"
                    id="postImageUrl"
                    placeholder="https://..."
                >

            </div>


            <button
                type="submit"
                class="btn full-width"
            >
                Közzététel
            </button>


        </form>

    `);


    const form =
        $("#createPostForm");


    if (form) {

        form.addEventListener(
            "submit",
            handleCreatePost
        );

    }

}


/* =========================================================
   BEJEGYZÉS MENTÉSE
========================================================= */

async function handleCreatePost(event) {

    event.preventDefault();


    if (!supabaseClient) {

        showToast(
            "A Supabase még nincs beállítva.",
            "error"
        );

        return;

    }


    if (!appState.currentUser) {

        showToast(
            "Először jelentkezz be.",
            "error"
        );

        return;

    }


    const body =
        $("#postBody")?.value.trim();


    const imageUrl =
        $("#postImageUrl")?.value.trim();


    if (!body) {

        showToast(
            "Írd le, mit szeretnél megosztani.",
            "error"
        );

        return;

    }


    setLoading(true);


    try {

        const {
            error
        } = await supabaseClient

            .from("posts")

            .insert({

                author_id:
                    appState.currentUser.id,

                body,

                image_url:
                    imageUrl || null

            });


        if (error) {

            console.error(
                "Bejegyzés létrehozási hiba:",
                error
            );

            showToast(
                "Nem sikerült közzétenni a bejegyzést.",
                "error"
            );

            return;

        }


        closeModal();

        showToast(
            "A bejegyzés közzétéve."
        );

        await renderCurrentView();

    } catch (error) {

        console.error(error);

        showToast(
            "Hiba történt a bejegyzés létrehozásakor.",
            "error"
        );

    } finally {

        setLoading(false);

    }

}


/* =========================================================
   KÉRDÉSEK
========================================================= */

async function renderQuestions(page) {

    page.innerHTML = `

        ${pageHeader(
            "Kérdések",
            "Kérdezz, válaszolj és segíts másoknak.",
            `
                <button
                    type="button"
                    class="btn"
                    data-create-question
                >
                    ＋ Kérdés
                </button>
            `
        )}


        <div
            id="questionsList"
        >

            <div class="card empty">

                Még nincsenek feltett kérdések.

            </div>

        </div>

    `;


    if (!supabaseClient) {
        return;
    }


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("questions")

            .select(`
                id,
                title,
                body,
                subject,
                solved,
                created_at,
                author_id,
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

            console.error(
                "Kérdések betöltési hiba:",
                error
            );

            return;

        }


        const container =
            $("#questionsList");


        if (
            !container ||
            !data ||
            !data.length
        ) {

            return;

        }


        container.innerHTML =
            data
                .map(
                    renderQuestion
                )
                .join("");


    } catch (error) {

        console.error(error);

    }

}


/* =========================================================
   KÉRDÉS HTML
========================================================= */

function renderQuestion(question) {

    const author =
        question.profiles || {};


    return `

        <article class="card question">


            <div class="post-head">

                <div class="avatar">

                    ${
                        author.avatar_url

                            ? `
                                <img
                                    src="${escapeHTML(author.avatar_url)}"
                                    alt="Profilkép"
                                >
                            `

                            : escapeHTML(
                                getInitials(
                                    author.name || "?"
                                )
                            )
                    }

                </div>


                <div class="post-meta">

                    <b>
                        ${escapeHTML(
                            author.name ||
                            "Ismeretlen"
                        )}
                    </b>

                    <span>

                        ${escapeHTML(
                            question.subject ||
                            "Általános"
                        )}

                        ·

                        ${escapeHTML(
                            formatDate(
                                question.created_at
                            )
                        )}

                    </span>

                </div>


                ${
                    question.solved

                        ? `
                            <span class="tag">
                                ✓ Megoldva
                            </span>
                        `

                        : ""
                }

            </div>


            <h2>
                ${escapeHTML(
                    question.title
                )}
            </h2>


            <p class="post-body">

                ${escapeHTML(
                    question.body
                )}

            </p>


            <hr>


            <button
                type="button"
                class="btn secondary small"
                data-answer-question="${escapeHTML(question.id)}"
            >
                Válasz írása
            </button>


        </article>

    `;

}


/* =========================================================
   ÚJ KÉRDÉS
========================================================= */

function openCreateQuestion() {

    openModal(`

        <h2>
            Új kérdés
        </h2>


        <form
            id="createQuestionForm"
        >


            <div class="form-group">

                <label for="questionTitle">
                    Kérdés címe
                </label>

                <input
                    id="questionTitle"
                    required
                    placeholder="Pl. Hogyan működik az INNER JOIN?"
                >

            </div>


            <div class="form-group">

                <label for="questionSubject">
                    Tantárgy
                </label>

                <input
                    id="questionSubject"
                    placeholder="Pl. Adatbázis-kezelés"
                >

            </div>


            <div class="form-group">

                <label for="questionBody">
                    Kérdés részletesen
                </label>

                <textarea
                    id="questionBody"
                    required
                    placeholder="Írd le részletesen, miben szeretnél segítséget."
                ></textarea>

            </div>


            <button
                type="submit"
                class="btn full-width"
            >
                Kérdés közzététele
            </button>


        </form>

    `);


    $("#createQuestionForm")
        ?.addEventListener(
            "submit",
            handleCreateQuestion
        );

}


/* =========================================================
   KÉRDÉS MENTÉSE
========================================================= */

async function handleCreateQuestion(event) {

    event.preventDefault();


    if (!supabaseClient) {

        showToast(
            "A Supabase még nincs beállítva.",
            "error"
        );

        return;

    }


    const title =
        $("#questionTitle")?.value.trim();


    const subject =
        $("#questionSubject")?.value.trim();


    const body =
        $("#questionBody")?.value.trim();


    if (!title || !body) {

        showToast(
            "A cím és a kérdés megadása kötelező.",
            "error"
        );

        return;

    }


    setLoading(true);


    try {

        const {
            error
        } = await supabaseClient

            .from("questions")

            .insert({

                author_id:
                    appState.currentUser.id,

                title,

                body,

                subject:
                    subject || null

            });


        if (error) {

            console.error(error);

            showToast(
                "Nem sikerült létrehozni a kérdést.",
                "error"
            );

            return;

        }


        closeModal();

        showToast(
            "A kérdés közzétéve."
        );

        await renderCurrentView();

    } catch (error) {

        console.error(error);

        showToast(
            "Hiba történt.",
            "error"
        );

    } finally {

        setLoading(false);

    }

}


/* =========================================================
   ÜZENETEK
========================================================= */

async function renderMessages(page) {

    page.innerHTML = `

        ${pageHeader(
            "Üzenetek",
            "Privát és csoportos beszélgetések.",
            `
                <button
                    type="button"
                    class="btn"
                    data-new-message
                >
                    ＋ Új beszélgetés
                </button>
            `
        )}


        <div class="card chat-layout">


            <div
                class="chat-list"
                id="chatList"
            >

                <div class="empty">
                    Nincsenek beszélgetések.
                </div>

            </div>


            <div class="chat-window">

                <div
                    id="chatWindow"
                >

                    <div class="empty">

                        Válassz egy beszélgetést.

                    </div>

                </div>

            </div>


        </div>

    `;


    if (!supabaseClient) {
        return;
    }


    /*
     * A beszélgetések tényleges lekérése
     * a conversations és conversation_members
     * táblákból történik majd.
     */

}


/* =========================================================
   CSOPORTOK
========================================================= */

async function renderGroups(page) {

    page.innerHTML = `

        ${pageHeader(
            "Csoportok",
            "Osztályok, szakmai és tanulócsoportok.",
            `
                <button
                    type="button"
                    class="btn"
                    data-create-group
                >
                    ＋ Csoport
                </button>
            `
        )}


        <div
            id="groupsList"
            class="grid"
        >

            <div class="card empty">

                Még nincsenek csoportok.

            </div>

        </div>

    `;


    if (!supabaseClient) {
        return;
    }


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("groups")

            .select("*")

            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {

            console.error(error);

            return;

        }


        const container =
            $("#groupsList");


        if (
            !container ||
            !data ||
            !data.length
        ) {

            return;

        }


        container.innerHTML =
            data
                .map(
                    group => `

                        <article class="card">

                            <div class="cover">
                                👥
                            </div>

                            <h2>
                                ${escapeHTML(
                                    group.name
                                )}
                            </h2>

                            <p class="muted">

                                ${escapeHTML(
                                    group.description ||
                                    ""
                                )}

                            </p>

                            <button
                                type="button"
                                class="btn secondary"
                                data-group-id="${escapeHTML(group.id)}"
                            >
                                Megnyitás
                            </button>

                        </article>

                    `
                )
                .join("");


    } catch (error) {

        console.error(error);

    }

}


/* =========================================================
   TANTÁRGYAK
========================================================= */

async function renderSubjects(page) {

    page.innerHTML = `

        ${pageHeader(
            "Tantárgyak",
            "Tanulási területek és szakmai témák."
        )}


        <div
            id="subjectsList"
            class="grid"
        >

            <div class="card empty">

                Még nincsenek tantárgyak.

            </div>

        </div>

    `;


    if (!supabaseClient) {
        return;
    }


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("subjects")

            .select("*")

            .order(
                "name",
                {
                    ascending: true
                }
            );


        if (error) {

            console.error(error);

            return;

        }


        const container =
            $("#subjectsList");


        if (
            !container ||
            !data ||
            !data.length
        ) {

            return;

        }


        container.innerHTML =
            data
                .map(
                    subject => `

                        <article class="card">

                            <div class="cover">
                                📚
                            </div>

                            <h2>
                                ${escapeHTML(
                                    subject.name
                                )}
                            </h2>

                            <p class="muted">

                                ${escapeHTML(
                                    subject.description ||
                                    ""
                                )}

                            </p>

                            <button
                                type="button"
                                class="btn secondary"
                                data-subject-id="${escapeHTML(subject.id)}"
                            >
                                Megnyitás
                            </button>

                        </article>

                    `
                )
                .join("");


    } catch (error) {

        console.error(error);

    }

}


/* =========================================================
   TANANYAGOK
========================================================= */

async function renderMaterials(page) {

    page.innerHTML = `

        ${pageHeader(
            "Tananyagok",
            "Jegyzetek, dokumentumok és segédanyagok.",
            `
                <button
                    type="button"
                    class="btn"
                    data-add-material
                >
                    ＋ Tananyag
                </button>
            `
        )}


        <div
            id="materialsList"
            class="list"
        >

            <div class="card empty">

                Még nincsenek feltöltött tananyagok.

            </div>

        </div>

    `;


    if (!supabaseClient) {
        return;
    }


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("study_materials")

            .select(`
                *,
                subjects (
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

            console.error(error);

            return;

        }


        const container =
            $("#materialsList");


        if (
            !container ||
            !data ||
            !data.length
        ) {

            return;

        }


        container.innerHTML =
            data
                .map(
                    material => `

                        <div class="list-item">

                            <div>
                                📖
                            </div>

                            <div>

                                <b>
                                    ${escapeHTML(
                                        material.title
                                    )}
                                </b>

                                <div class="muted">

                                    ${escapeHTML(
                                        material.subjects?.name ||
                                        "Általános"
                                    )}

                                </div>

                                <p>

                                    ${escapeHTML(
                                        material.description ||
                                        ""
                                    )}

                                </p>

                            </div>

                            ${
                                material.file_url

                                    ? `
                                        <a
                                            class="btn secondary small"
                                            href="${escapeHTML(material.file_url)}"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Megnyitás
                                        </a>
                                    `

                                    : ""
                            }

                        </div>

                    `
                )
                .join("");


    } catch (error) {

        console.error(error);

    }

}


/* =========================================================
   ISKOLAI HÍREK
========================================================= */

async function renderAnnouncements(page) {

    page.innerHTML = `

        ${pageHeader(
            "Iskolai hírek",
            "Fontos információk és közlemények."
        )}


        <div
            id="announcementsList"
        >

            <div class="card empty">

                Még nincsenek közzétett hírek.

            </div>

        </div>

    `;


    if (!supabaseClient) {
        return;
    }


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("announcements")

            .select("*")

            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {

            console.error(error);

            return;

        }


        const container =
            $("#announcementsList");


        if (
            !container ||
            !data ||
            !data.length
        ) {

            return;

        }


        container.innerHTML =
            data
                .map(
                    announcement => `

                        <article class="card announcement">

                            <span class="tag">
                                📢 Iskolai hír
                            </span>

                            <h2>
                                ${escapeHTML(
                                    announcement.title
                                )}
                            </h2>

                            <p>

                                ${escapeHTML(
                                    announcement.body
                                )}

                            </p>

                            <small class="muted">

                                ${escapeHTML(
                                    formatDate(
                                        announcement.created_at
                                    )
                                )}

                            </small>

                        </article>

                    `
                )
                .join("");


    } catch (error) {

        console.error(error);

    }

}


/* =========================================================
   MENTÉSEK
========================================================= */

async function renderSaved(page) {

    page.innerHTML = `

        ${pageHeader(
            "Mentések",
            "Az általad elmentett tartalmak."
        )}


        <div
            class="card empty"
        >

            Még nincs mentett tartalmad.

        </div>

    `;


    if (!supabaseClient) {
        return;
    }

}


/* =========================================================
   PROFIL
========================================================= */

async function renderProfile(page) {

    const user =
        appState.currentUser;


    if (!user) {

        page.innerHTML = `

            <div class="card empty">

                A profil megtekintéséhez
                be kell jelentkezned.

            </div>

        `;

        return;

    }


    page.innerHTML = `

        ${pageHeader(
            "Profil",
            "A saját profilod.",
            `
                <button
                    type="button"
                    class="btn"
                    data-edit-profile
                >
                    Profil szerkesztése
                </button>
            `
        )}


        <div class="card profile-hero">


            <div
                id="profileAvatar"
                class="avatar profile-big"
            >

                ${
                    user.avatar_url

                        ? `
                            <img
                                src="${escapeHTML(user.avatar_url)}"
                                alt="Profilkép"
                            >
                        `

                        : escapeHTML(
                            getInitials(
                                user.name
                            )
                        )
                }

            </div>


            <div>

                <h1>
                    ${escapeHTML(
                        user.name ||
                        "Felhasználó"
                    )}
                </h1>


                <div class="muted">

                    ${escapeHTML(
                        user.class_name ||
                        ""
                    )}

                    ${
                        user.class_name
                            ? " · "
                            : ""
                    }

                    ${escapeHTML(
                        translateRole(
                            user.role
                        )
                    )}

                </div>


                ${
                    user.bio

                        ? `
                            <p>
                                ${escapeHTML(
                                    user.bio
                                )}
                            </p>
                        `

                        : ""
                }

            </div>

        </div>


        <div class="stat-grid">


            <div class="stat">

                <strong>
                    0
                </strong>

                Bejegyzés

            </div>


            <div class="stat">

                <strong>
                    0
                </strong>

                Csoport

            </div>


            <div class="stat">

                <strong>
                    0
                </strong>

                Kérdés

            </div>


            <div class="stat">

                <strong>
                    0
                </strong>

                Mentés

            </div>


        </div>


        <div class="card">

            <h2>
                Fiók
            </h2>

            <p class="muted">

                ${escapeHTML(
                    user.email ||
                    ""
                )}

            </p>

            <br>

            <button
                type="button"
                class="btn danger"
                data-logout
            >
                Kijelentkezés
            </button>

        </div>

    `;

}


/* =========================================================
   SZEREPKÖR FORDÍTÁSA
========================================================= */

function translateRole(role) {

    switch (role) {

        case "teacher":
            return "Tanár";

        case "admin":
            return "Adminisztrátor";

        case "student":
        default:
            return "Diák";

    }

}


/* =========================================================
   PROFIL SZERKESZTÉSE
========================================================= */

function openEditProfile() {

    const user =
        appState.currentUser;


    if (!user) {
        return;
    }


    openModal(`

        <h2>
            Profil szerkesztése
        </h2>


        <form
            id="editProfileForm"
        >


            <div class="form-group">

                <label for="profileName">
                    Név
                </label>

                <input
                    id="profileName"
                    value="${escapeHTML(user.name || "")}"
                    required
                >

            </div>


            <div class="form-group">

                <label for="profileClass">
                    Osztály
                </label>

                <input
                    id="profileClass"
                    value="${escapeHTML(user.class_name || "")}"
                >

            </div>


            <div class="form-group">

                <label for="profileBio">
                    Bemutatkozás
                </label>

                <textarea
                    id="profileBio"
                    placeholder="Írj néhány sort magadról…"
                >${escapeHTML(user.bio || "")}</textarea>

            </div>


            <div class="form-group">

                <label for="profileAvatarUrl">
                    Profilkép URL
                </label>

                <input
                    type="url"
                    id="profileAvatarUrl"
                    value="${escapeHTML(user.avatar_url || "")}"
                    placeholder="https://..."
                >

            </div>


            <button
                type="submit"
                class="btn full-width"
            >
                Mentés
            </button>


        </form>

    `);


    $("#editProfileForm")
        ?.addEventListener(
            "submit",
            handleEditProfile
        );

}


/* =========================================================
   PROFIL MENTÉSE
========================================================= */

async function handleEditProfile(event) {

    event.preventDefault();


    if (!supabaseClient) {

        showToast(
            "A Supabase még nincs beállítva.",
            "error"
        );

        return;

    }


    const name =
        $("#profileName")?.value.trim();


    const className =
        $("#profileClass")?.value.trim();


    const bio =
        $("#profileBio")?.value.trim();


    const avatarUrl =
        $("#profileAvatarUrl")?.value.trim();


    if (!name) {

        showToast(
            "A név nem lehet üres.",
            "error"
        );

        return;

    }


    setLoading(true);


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("profiles")

            .update({

                name,

                class_name:
                    className || null,

                bio:
                    bio || null,

                avatar_url:
                    avatarUrl || null

            })

            .eq(
                "id",
                appState.currentUser.id
            )

            .select()

            .single();


        if (error) {

            console.error(error);

            showToast(
                "Nem sikerült menteni a profilt.",
                "error"
            );

            return;

        }


        appState.currentUser =
            data;


        updateUserInterface();

        closeModal();

        showToast(
            "Profil frissítve."
        );

        await renderCurrentView();

    } catch (error) {

        console.error(error);

        showToast(
            "Hiba történt a profil mentésekor.",
            "error"
        );

    } finally {

        setLoading(false);

    }

}


/* =========================================================
   ÉRTESÍTÉSEK
========================================================= */

async function renderNotifications(page) {

    page.innerHTML = `

        ${pageHeader(
            "Értesítések",
            "Legutóbbi aktivitásaid."
        )}


        <div
            id="notificationsList"
            class="list"
        >

            <div class="card empty">

                Nincsenek értesítések.

            </div>

        </div>

    `;


    if (!supabaseClient) {
        return;
    }


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("notifications")

            .select("*")

            .eq(
                "user_id",
                appState.currentUser.id
            )

            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {

            console.error(error);

            return;

        }


        const container =
            $("#notificationsList");


        if (
            !container ||
            !data ||
            !data.length
        ) {

            return;

        }


        container.innerHTML =
            data
                .map(
                    notification => `

                        <div class="list-item">

                            <div>
                                🔔
                            </div>

                            <div>

                                <b>
                                    ${notification.read ? "" : "Új · "}
                                </b>

                                ${escapeHTML(
                                    notification.text
                                )}

                                <div class="muted">

                                    ${escapeHTML(
                                        formatDate(
                                            notification.created_at
                                        )
                                    )}

                                </div>

                            </div>

                        </div>

                    `
                )
                .join("");


    } catch (error) {

        console.error(error);

    }

}


/* =========================================================
   BEÁLLÍTÁSOK
========================================================= */

async function renderSettings(page) {

    page.innerHTML = `

        ${pageHeader(
            "Beállítások",
            "A SZESZI személyes beállításai."
        )}


        <div class="card">

            <h2>
                Megjelenés
            </h2>

            <br>

            <label>

                <input
                    type="checkbox"
                    id="darkMode"
                >

                Sötét mód

            </label>

        </div>


        <div class="card">

            <h2>
                Fiók
            </h2>

            <br>

            <button
                type="button"
                class="btn danger"
                data-logout
            >
                Kijelentkezés
            </button>

        </div>

    `;


    const darkMode =
        $("#darkMode");


    if (darkMode) {

        darkMode.checked =
            localStorage.getItem(
                "szeszi_dark_mode"
            ) === "true";

    }

}


/* =========================================================
   ADMIN
========================================================= */

async function renderAdmin(page) {

    if (
        appState.currentUser?.role !==
        "admin"
    ) {

        page.innerHTML = `

            <div class="card empty">

                Nincs jogosultságod az adminisztrációhoz.

            </div>

        `;

        return;

    }


    page.innerHTML = `

        ${pageHeader(
            "Adminisztráció",
            "Az iskolai közösségi rendszer kezelése."
        )}


        <div class="stat-grid">

            <div class="stat">

                <strong>
                    —
                </strong>

                Felhasználók

            </div>


            <div class="stat">

                <strong>
                    —
                </strong>

                Bejegyzések

            </div>


            <div class="stat">

                <strong>
                    —
                </strong>

                Kérdések

            </div>


            <div class="stat">

                <strong>
                    —
                </strong>

                Jelentések

            </div>

        </div>


        <div class="card">

            <h2>
                Adminisztráció
            </h2>

            <p class="muted">

                A felhasználók, bejegyzések,
                kérdések, csoportok és iskolai
                közlemények kezelése itt lesz elérhető.

            </p>

        </div>

    `;

}


/* =========================================================
   KERESÉS
========================================================= */

async function performSearch(term) {

    const query =
        term.trim();


    if (!query) {
        return;
    }


    appState.searchTerm =
        query;


    appState.currentView =
        "search";


    await renderCurrentView();

}


/* =========================================================
   KERESÉS OLDAL
========================================================= */

async function renderSearch(page) {

    const term =
        appState.searchTerm;


    page.innerHTML = `

        ${pageHeader(
            "Keresés",
            `Találatok erre: „${term}”`
        )}


        <div
            id="searchResults"
        >

            <div class="card empty">

                Keresés folyamatban…

            </div>

        </div>

    `;


    if (!supabaseClient) {

        $("#searchResults").innerHTML = `

            <div class="card empty">

                A kereséshez először be kell állítani a Supabase adatbázist.

            </div>

        `;

        return;

    }


    try {

        const search =
            `%${term}%`;


        const [
            profilesResult,
            postsResult,
            questionsResult
        ] = await Promise.all([

            supabaseClient

                .from("profiles")

                .select(
                    "id,name,class_name,avatar_url"
                )

                .ilike(
                    "name",
                    search
                )

                .limit(20),


            supabaseClient

                .from("posts")

                .select(
                    "id,body,created_at"
                )

                .ilike(
                    "body",
                    search
                )

                .limit(20),


            supabaseClient

                .from("questions")

                .select(
                    "id,title,body,subject"
                )

                .or(
                    `title.ilike.${search},body.ilike.${search}`
                )

                .limit(20)

        ]);


        const results =
            $("#searchResults");


        if (!results) {
            return;
        }


        const profiles =
            profilesResult.data || [];


        const posts =
            postsResult.data || [];


        const questions =
            questionsResult.data || [];


        if (
            !profiles.length &&
            !posts.length &&
            !questions.length
        ) {

            results.innerHTML = `

                <div class="card empty">

                    Nincs találat.

                </div>

            `;

            return;

        }


        results.innerHTML = `

            ${
                profiles.length

                    ? `

                        <div class="card">

                            <h2>
                                Felhasználók
                            </h2>

                            ${profiles.map(
                                user => `

                                    <div class="search-result">

                                        <b>
                                            👤
                                            ${escapeHTML(
                                                user.name
                                            )}
                                        </b>

                                        <div>
                                            ${escapeHTML(
                                                user.class_name ||
                                                ""
                                            )}
                                        </div>

                                    </div>

                                `
                            ).join("")}

                        </div>

                    `

                    : ""
            }


            ${
                posts.length

                    ? `

                        <div class="card">

                            <h2>
                                Bejegyzések
                            </h2>

                            ${posts.map(
                                post => `

                                    <div class="search-result">

                                        <b>
                                            📝 Bejegyzés
                                        </b>

                                        <div>
                                            ${escapeHTML(
                                                post.body
                                            )}
                                        </div>

                                    </div>

                                `
                            ).join("")}

                        </div>

                    `

                    : ""
            }


            ${
                questions.length

                    ? `

                        <div class="card">

                            <h2>
                                Kérdések
                            </h2>

                            ${questions.map(
                                question => `

                                    <div class="search-result">

                                        <b>
                                            ❓
                                            ${escapeHTML(
                                                question.title
                                            )}
                                        </b>

                                        <div>
                                            ${escapeHTML(
                                                question.body
                                            )}
                                        </div>

                                    </div>

                                `
                            ).join("")}

                        </div>

                    `

                    : ""
            }

        `;


    } catch (error) {

        console.error(error);

        $("#searchResults").innerHTML = `

            <div class="card empty">

                A keresés során hiba történt.

            </div>

        `;

    }

}


/* =========================================================
   DARK MODE
========================================================= */

function initializeTheme() {

    const saved =
        localStorage.getItem(
            "szeszi_dark_mode"
        );


    document.body.classList.toggle(
        "dark",
        saved === "true"
    );

}


function toggleDarkMode(enabled) {

    document.body.classList.toggle(
        "dark",
        enabled
    );


    localStorage.setItem(
        "szeszi_dark_mode",
        enabled
            ? "true"
            : "false"
    );

}


/* =========================================================
   ESEMÉNYKEZELŐK
========================================================= */

function setupEventListeners() {


    /* -----------------------------------------
       AUTH VÁLTÁS
    ----------------------------------------- */

    $("#showRegister")
        ?.addEventListener(
            "click",
            showRegister
        );


    $("#showLogin")
        ?.addEventListener(
            "click",
            showLogin
        );


    $("#loginForm")
        ?.addEventListener(
            "submit",
            handleLogin
        );


    $("#registerForm")
        ?.addEventListener(
            "submit",
            handleRegister
        );


    /* -----------------------------------------
       MENÜ
    ----------------------------------------- */

    $("#menuBtn")
        ?.addEventListener(
            "click",
            toggleSidebar
        );


    /* -----------------------------------------
       KERESÉS
    ----------------------------------------- */

    $("#globalSearch")
        ?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {

                    performSearch(
                        event.target.value
                    );

                }

            }
        );


    /* -----------------------------------------
       KATTINTÁSOK
    ----------------------------------------- */

    document.addEventListener(
        "click",
        handleDocumentClick
    );


    /* -----------------------------------------
       MODAL BEZÁRÁS
    ----------------------------------------- */

    document.addEventListener(
        "click",
        event => {

            if (
                event.target.closest(
                    "[data-close-modal]"
                )
            ) {

                closeModal();

            }

        }
    );


    /* -----------------------------------------
       DARK MODE
    ----------------------------------------- */

    document.addEventListener(
        "change",
        event => {

            if (
                event.target.id ===
                "darkMode"
            ) {

                toggleDarkMode(
                    event.target.checked
                );

            }

        }
    );

}


/* =========================================================
   DOKUMENTUM KATTINTÁS
========================================================= */

function handleDocumentClick(event) {

    const viewButton =
        event.target.closest(
            "[data-view]"
        );


    if (viewButton) {

        navigate(
            viewButton.dataset.view
        );

        return;

    }


    if (
        event.target.closest(
            "[data-create-post]"
        )
    ) {

        openCreatePost();

        return;

    }


    if (
        event.target.closest(
            "[data-create-question]"
        )
    ) {

        openCreateQuestion();

        return;

    }


    if (
        event.target.closest(
            "[data-new-message]"
        )
    ) {

        showToast(
            "Az új beszélgetés funkció a Supabase üzenetrendszer bekötése után lesz aktív."
        );

        return;

    }


    if (
        event.target.closest(
            "[data-create-group]"
        )
    ) {

        openCreateGroup();

        return;

    }


    if (
        event.target.closest(
            "[data-add-material]"
        )
    ) {

        openAddMaterial();

        return;

    }


    if (
        event.target.closest(
            "[data-edit-profile]"
        )
    ) {

        openEditProfile();

        return;

    }


    if (
        event.target.closest(
            "[data-logout]"
        )
    ) {

        logout();

        return;

    }


    if (
        event.target.closest(
            "[data-like-post]"
        )
    ) {

        handleLikePost(
            event.target.closest(
                "[data-like-post]"
            ).dataset.likePost
        );

        return;

    }


    if (
        event.target.closest(
            "[data-comment-post]"
        )
    ) {

        const id =
            event.target.closest(
                "[data-comment-post]"
            ).dataset.commentPost;

        openCommentModal(id);

        return;

    }


    if (
        event.target.closest(
            "[data-share-post]"
        )
    ) {

        sharePost(
            event.target.closest(
                "[data-share-post]"
            ).dataset.sharePost
        );

        return;

    }


    if (
        event.target.closest(
            "[data-save-post]"
        )
    ) {

        savePost(
            event.target.closest(
                "[data-save-post]"
            ).dataset.savePost
        );

        return;

    }


    if (
        event.target.closest(
            "[data-answer-question]"
        )
    ) {

        const id =
            event.target.closest(
                "[data-answer-question]"
            ).dataset.answerQuestion;

        openAnswerModal(id);

        return;

    }

}


/* =========================================================
   LIKE
========================================================= */

async function handleLikePost(postId) {

    if (!supabaseClient) {

        showToast(
            "A Supabase még nincs beállítva.",
            "error"
        );

        return;

    }


    if (!appState.currentUser) {
        return;
    }


    try {

        const {
            data: existing,
            error: selectError
        } = await supabaseClient

            .from("post_reactions")

            .select("*")

            .eq(
                "post_id",
                postId
            )

            .eq(
                "user_id",
                appState.currentUser.id
            )

            .maybeSingle();


        if (selectError) {
            throw selectError;
        }


        if (existing) {

            const {
                error
            } = await supabaseClient

                .from("post_reactions")

                .delete()

                .eq(
                    "post_id",
                    postId
                )

                .eq(
                    "user_id",
                    appState.currentUser.id
                );


            if (error) {
                throw error;
            }


        } else {

            const {
                error
            } = await supabaseClient

                .from("post_reactions")

                .insert({

                    post_id: postId,

                    user_id:
                        appState.currentUser.id,

                    reaction: "like"

                });


            if (error) {
                throw error;
            }

        }


        await renderCurrentView();

    } catch (error) {

        console.error(error);

        showToast(
            "Nem sikerült módosítani a reakciót.",
            "error"
        );

    }

}


/* =========================================================
   HOZZÁSZÓLÁS
========================================================= */

function openCommentModal(postId) {

    openModal(`

        <h2>
            Hozzászólás
        </h2>


        <form id="commentForm">


            <div class="form-group">

                <label for="commentText">
                    Hozzászólás
                </label>

                <textarea
                    id="commentText"
                    required
                    placeholder="Írd le a hozzászólásodat…"
                ></textarea>

            </div>


            <button
                type="submit"
                class="btn full-width"
            >
                Küldés
            </button>


        </form>

    `);


    $("#commentForm")
        ?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const text =
                    $("#commentText")
                        ?.value.trim();


                if (!text) {
                    return;
                }


                if (!supabaseClient) {

                    showToast(
                        "A Supabase még nincs beállítva.",
                        "error"
                    );

                    return;

                }


                try {

                    const {
                        error
                    } = await supabaseClient

                        .from("comments")

                        .insert({

                            post_id:
                                postId,

                            author_id:
                                appState.currentUser.id,

                            body:
                                text

                        });


                    if (error) {
                        throw error;
                    }


                    closeModal();

                    showToast(
                        "Hozzászólás elküldve."
                    );


                    await renderCurrentView();

                } catch (error) {

                    console.error(error);

                    showToast(
                        "Nem sikerült elküldeni a hozzászólást.",
                        "error"
                    );

                }

            }
        );

}


/* =========================================================
   MEGOSZTÁS
========================================================= */

async function sharePost(postId) {

    const url =
        `${window.location.origin}${window.location.pathname}?post=${encodeURIComponent(postId)}`;


    try {

        if (
            navigator.share
        ) {

            await navigator.share({

                title: "SZESZI",

                text:
                    "Egy bejegyzés a SZESZI-ben.",

                url

            });

            return;

        }


        await navigator.clipboard.writeText(
            url
        );


        showToast(
            "A bejegyzés linkje a vágólapra került."
        );

    } catch (error) {

        console.error(error);

    }

}


/* =========================================================
   MENTÉS
========================================================= */

async function savePost(postId) {

    if (!supabaseClient) {

        showToast(
            "A Supabase még nincs beállítva.",
            "error"
        );

        return;

    }


    try {

        const {
            data: existing,
            error: selectError
        } = await supabaseClient

            .from("saved_posts")

            .select("*")

            .eq(
                "user_id",
                appState.currentUser.id
            )

            .eq(
                "post_id",
                postId
            )

            .maybeSingle();


        if (selectError) {
            throw selectError;
        }


        if (existing) {

            const {
                error
            } = await supabaseClient

                .from("saved_posts")

                .delete()

                .eq(
                    "user_id",
                    appState.currentUser.id
                )

                .eq(
                    "post_id",
                    postId
                );


            if (error) {
                throw error;
            }


            showToast(
                "Bejegyzés eltávolítva a mentésekből."
            );


        } else {

            const {
                error
            } = await supabaseClient

                .from("saved_posts")

                .insert({

                    user_id:
                        appState.currentUser.id,

                    post_id:
                        postId

                });


            if (error) {
                throw error;
            }


            showToast(
                "Bejegyzés elmentve."
            );

        }

    } catch (error) {

        console.error(error);

        showToast(
            "Nem sikerült módosítani a mentést.",
            "error"
        );

    }

}


/* =========================================================
   VÁLASZ
========================================================= */

function openAnswerModal(questionId) {

    openModal(`

        <h2>
            Válasz a kérdésre
        </h2>


        <form id="answerForm">


            <div class="form-group">

                <label for="answerText">
                    Válasz
                </label>

                <textarea
                    id="answerText"
                    required
                    placeholder="Írd le a válaszodat…"
                ></textarea>

            </div>


            <button
                type="submit"
                class="btn full-width"
            >
                Válasz elküldése
            </button>


        </form>

    `);


    $("#answerForm")
        ?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const text =
                    $("#answerText")
                        ?.value.trim();


                if (!text) {
                    return;
                }


                if (!supabaseClient) {

                    showToast(
                        "A Supabase még nincs beállítva.",
                        "error"
                    );

                    return;

                }


                try {

                    const {
                        error
                    } = await supabaseClient

                        .from("answers")

                        .insert({

                            question_id:
                                questionId,

                            author_id:
                                appState.currentUser.id,

                            body:
                                text

                        });


                    if (error) {
                        throw error;
                    }


                    closeModal();

                    showToast(
                        "A válasz elküldve."
                    );


                    await renderCurrentView();

                } catch (error) {

                    console.error(error);

                    showToast(
                        "Nem sikerült elküldeni a választ.",
                        "error"
                    );

                }

            }
        );

}


/* =========================================================
   CSOPORT LÉTREHOZÁSA
========================================================= */

function openCreateGroup() {

    openModal(`

        <h2>
            Új csoport
        </h2>


        <form id="createGroupForm">


            <div class="form-group">

                <label for="groupName">
                    Csoport neve
                </label>

                <input
                    id="groupName"
                    required
                    placeholder="Pl. Programozás gyakorló"
                >

            </div>


            <div class="form-group">

                <label for="groupDescription">
                    Leírás
                </label>

                <textarea
                    id="groupDescription"
                    placeholder="Miről szól a csoport?"
                ></textarea>

            </div>


            <button
                type="submit"
                class="btn full-width"
            >
                Csoport létrehozása
            </button>


        </form>

    `);


    $("#createGroupForm")
        ?.addEventListener(
            "submit",
            handleCreateGroup
        );

}


/* =========================================================
   CSOPORT MENTÉSE
========================================================= */

async function handleCreateGroup(event) {

    event.preventDefault();


    if (!supabaseClient) {

        showToast(
            "A Supabase még nincs beállítva.",
            "error"
        );

        return;

    }


    const name =
        $("#groupName")?.value.trim();


    const description =
        $("#groupDescription")
            ?.value.trim();


    if (!name) {

        showToast(
            "A csoport neve kötelező.",
            "error"
        );

        return;

    }


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("groups")

            .insert({

                name,

                description:
                    description || null,

                created_by:
                    appState.currentUser.id

            })

            .select()

            .single();


        if (error) {
            throw error;
        }


        if (data) {

            await supabaseClient

                .from("group_members")

                .insert({

                    group_id:
                        data.id,

                    user_id:
                        appState.currentUser.id,

                    role:
                        "owner"

                });

        }


        closeModal();

        showToast(
            "Csoport létrehozva."
        );


        await renderCurrentView();

    } catch (error) {

        console.error(error);

        showToast(
            "Nem sikerült létrehozni a csoportot.",
            "error"
        );

    }

}


/* =========================================================
   TANANYAG HOZZÁADÁSA
========================================================= */

function openAddMaterial() {

    openModal(`

        <h2>
            Tananyag hozzáadása
        </h2>


        <form id="addMaterialForm">


            <div class="form-group">

                <label for="materialTitle">
                    Cím
                </label>

                <input
                    id="materialTitle"
                    required
                    placeholder="Tananyag címe"
                >

            </div>


            <div class="form-group">

                <label for="materialSubject">
                    Tantárgy azonosító
                </label>

                <input
                    id="materialSubject"
                    placeholder="Tantárgy"
                >

            </div>


            <div class="form-group">

                <label for="materialDescription">
                    Leírás
                </label>

                <textarea
                    id="materialDescription"
                    placeholder="A tananyag rövid leírása"
                ></textarea>

            </div>


            <div class="form-group">

                <label for="materialFileUrl">
                    Fájl URL
                </label>

                <input
                    type="url"
                    id="materialFileUrl"
                    placeholder="https://..."
                >

            </div>


            <button
                type="submit"
                class="btn full-width"
            >
                Mentés
            </button>


        </form>

    `);


    $("#addMaterialForm")
        ?.addEventListener(
            "submit",
            handleAddMaterial
        );

}


/* =========================================================
   TANANYAG MENTÉSE
========================================================= */

async function handleAddMaterial(event) {

    event.preventDefault();


    if (!supabaseClient) {

        showToast(
            "A Supabase még nincs beállítva.",
            "error"
        );

        return;

    }


    const title =
        $("#materialTitle")
            ?.value.trim();


    const description =
        $("#materialDescription")
            ?.value.trim();


    const fileUrl =
        $("#materialFileUrl")
            ?.value.trim();


    if (!title) {

        showToast(
            "A tananyag címe kötelező.",
            "error"
        );

        return;

    }


    try {

        const {
            error
        } = await supabaseClient

            .from("study_materials")

            .insert({

                title,

                description:
                    description || null,

                file_url:
                    fileUrl || null,

                created_by:
                    appState.currentUser.id

            });


        if (error) {
            throw error;
        }


        closeModal();

        showToast(
            "Tananyag hozzáadva."
        );


        await renderCurrentView();

    } catch (error) {

        console.error(error);

        showToast(
            "Nem sikerült hozzáadni a tananyagot.",
            "error"
        );

    }

}


/* =========================================================
   REALTIME
========================================================= */

function initializeRealtime() {

    if (!supabaseClient) {
        return;
    }


    /*
     * Bejegyzések figyelése.
     */

    supabaseClient

        .channel(
            "szeszi-posts"
        )

        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "posts"
            },
            async () => {

                if (
                    appState.currentView ===
                    "home"
                ) {

                    await renderCurrentView();

                }

            }
        )

        .subscribe();


    /*
     * Értesítések figyelése.
     */

    if (
        appState.currentUser
    ) {

        supabaseClient

            .channel(
                `notifications-${appState.currentUser.id}`
            )

            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter:
                        `user_id=eq.${appState.currentUser.id}`
                },
                notification => {

                    appState.notifications
                        .unshift(
                            notification.new
                        );

                    updateNotificationBadge();

                }
            )

            .subscribe();

    }

}


/* =========================================================
   ÉRTESÍTÉS JELZŐ
========================================================= */

function updateNotificationBadge() {

    const badge =
        $("#notificationBadge");


    if (!badge) {
        return;
    }


    const unread =
        appState.notifications
            .filter(
                notification =>
                    !notification.read
            )
            .length;


    if (!unread) {

        badge.hidden = true;

        return;

    }


    badge.hidden = false;

    badge.textContent =
        unread > 99
            ? "99+"
            : String(unread);

}


/* =========================================================
   ALKALMAZÁS INDÍTÁSA
========================================================= */

async function initializeApplication() {

    initializeTheme();

    updateUserInterface();

    updateComposerAvatar();

    updateNavigation();

    await renderCurrentView();

    initializeRealtime();

}


/* =========================================================
   SERVICE WORKER
========================================================= */

function initializeServiceWorker() {

    if (
        "serviceWorker" in navigator
    ) {

        window.addEventListener(
            "load",
            () => {

                navigator.serviceWorker
                    .register(
                        "sw.js"
                    )
                    .then(
                        registration => {

                            console.log(
                                "SZESZI Service Worker aktív:",
                                registration.scope
                            );

                        }
                    )
                    .catch(
                        error => {

                            console.warn(
                                "Service Worker nem érhető el:",
                                error
                            );

                        }
                    );

            }
        );

    }

}


/* =========================================================
   INDÍTÁS
========================================================= */

async function initializeApp() {

    initializeTheme();

    setupEventListeners();

    initializeServiceWorker();


    /*
     * Ha nincs még Supabase konfiguráció,
     * az alkalmazás nem tölt be fiktív adatokat.
     */

    const supabaseReady =
        await initializeSupabase();


    if (!supabaseReady) {

        showAuthScreen();

        showToast(
            "A SZESZI adatbázis-kapcsolata még nincs beállítva.",
            "error"
        );

        return;

    }


    await checkAuth();

}


/* =========================================================
   DOM READY
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeApp
    );

} else {

    initializeApp();

})