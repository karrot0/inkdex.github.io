/* SPDX-License-Identifier: GPL-3.0-or-later */
/* Copyright © 2025 Inkdex */

// https://vitepress.dev/guide/custom-theme
import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { h } from "vue";
import "./style.css";
import ExtensionList from "./components/ExtensionList.vue";
import ExtensionSearch from "./components/ExtensionSearch.vue";

export default {
    extends: DefaultTheme,
    Layout: () => {
        return h(DefaultTheme.Layout, null, {
            // https://vitepress.dev/guide/extending-default-theme#layout-slots
            "layout-bottom": () => h('ClientOnly', null, {
                default: () => h(ExtensionSearch)
            }),
        });
    },
    enhanceApp({ app, router, siteData }) {
        void app;
        void router;
        void siteData;
        app.component('ExtensionList', ExtensionList);
    },
} satisfies Theme;
