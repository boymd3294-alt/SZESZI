/*
=========================================================
SZESZI - SUPABASE CONFIG
Szigeti Endre Technikum
=========================================================

FONTOS:

Ide kizárólag a Supabase projekt:

1. Project URL
2. anon / publishable key

kerüljön.

SOHA ne tedd ide:
- service_role key
- database password
- secret key
- JWT secret
=========================================================
*/


window.SZESZI_SUPABASE = {

    /*
    -----------------------------------------------------
    SUPABASE PROJECT URL
    -----------------------------------------------------

    Példa:

    https://abcdefghijklmnop.supabase.co

    A saját projekted URL-jét írd ide.
    */

    url: "https://qjikkglmcbofnvmkfbmd.supabase.co",


    /*
    -----------------------------------------------------
    SUPABASE ANON / PUBLISHABLE KEY
    -----------------------------------------------------

    Supabase Dashboard:

    Project Settings
        ↓
    API

    Itt keresd a publikus:

    anon
    vagy
    publishable

    kulcsot.

    Ezt másold ide.
    */

    anonKey: "sb_publishable_ia9Rf4uCc8F72SkiF8WlEA_iDVeVbcl"

};


/*
=========================================================
ELLENŐRZÉS
=========================================================

Ezzel az app könnyebben jelzi, ha még nincs
beállítva a Supabase kapcsolat.

=========================================================
*/

(function () {

    const config = window.SZESZI_SUPABASE;


    if (!config) {

        console.error(
            "SZESZI: A Supabase konfiguráció nem található."
        );

        return;

    }


    if (!config.url || !config.anonKey) {

        console.warn(
            "SZESZI: A Supabase URL vagy anon/publishable key még nincs beállítva."
        );

        return;

    }


    console.log(
        "SZESZI: Supabase konfiguráció betöltve."
    );

})();