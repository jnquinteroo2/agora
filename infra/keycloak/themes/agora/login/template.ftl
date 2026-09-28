<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}" lang="es-CO">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="robots" content="noindex, nofollow">
    <title>${msg("loginTitle", (realm.displayName!'Colegio Ágora'))}</title>
    <link rel="icon" type="image/png" href="${url.resourcesPath}/img/favicon.png">
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet">
        </#list>
    </#if>
    <#if properties.scripts?has_content>
        <#list properties.scripts?split(' ') as script>
            <script src="${url.resourcesPath}/${script}" defer></script>
        </#list>
    </#if>
</head>
<body class="${properties.kcBodyClass!} ${bodyClass}" data-page-id="login-${pageId}">
    <a class="agora-saltar" href="#agora-contenido">Saltar al contenido</a>
    <header class="agora-encabezado">
        <div class="agora-contenedor agora-encabezado-fila">
            <span class="agora-marca">
                <img class="agora-logo agora-logo-claro" src="${url.resourcesPath}/img/logo-color-192.png" alt="" width="40" height="40">
                <img class="agora-logo agora-logo-oscuro" src="${url.resourcesPath}/img/logo-blanco-192.png" alt="" width="40" height="40">
                <span class="agora-marca-nombre">${realm.displayName!'Colegio Ágora'}</span>
            </span>
            <#if client?? && client.baseUrl?has_content>
                <a class="agora-enlace-secundario" href="${client.baseUrl?remove_ending('/panel')}/inicio">${msg("volverAlSitio")}</a>
            </#if>
        </div>
    </header>

    <main id="agora-contenido" class="agora-principal" tabindex="-1">
        <div class="agora-contenedor agora-principal-fila">
            <section class="agora-tarjeta" aria-labelledby="kc-page-title">
                <#if auth?has_content && auth.showUsername() && !auth.showResetCredentials()>
                    <div class="agora-usuario">
                        <span class="agora-usuario-correo">${auth.attemptedUsername}</span>
                        <a class="agora-enlace-secundario" href="${url.loginRestartFlowUrl}">${msg("restartLoginTooltip")}</a>
                    </div>
                </#if>
                <h1 id="kc-page-title" class="agora-titulo"><#nested "header"></h1>

                <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                    <p id="agora-aviso" class="agora-aviso agora-aviso-${message.type}" role="<#if message.type = 'error'>alert<#else>status</#if>" tabindex="-1">${kcSanitize(message.summary)?no_esc}</p>
                </#if>

                <#nested "form">

                <#if auth?has_content && auth.showTryAnotherWayLink()>
                    <form id="kc-select-try-another-way-form" class="agora-otro-metodo" action="${url.loginAction}" method="post">
                        <input type="hidden" name="tryAnotherWay" value="on">
                        <button type="submit" class="agora-boton-enlace">${msg("doTryAnotherWay")}</button>
                    </form>
                </#if>

                <#if displayInfo>
                    <div class="agora-info"><#nested "info"></div>
                </#if>
            </section>
        </div>
    </main>

    <footer class="agora-pie">
        <div class="agora-contenedor agora-pie-fila">
            <p>© ${.now?string('yyyy')} ${realm.displayName!'Colegio Ágora'}</p>
            <#if client?? && client.baseUrl?has_content>
                <#assign plataforma = client.baseUrl?remove_ending('/panel')>
                <ul class="agora-pie-enlaces">
                    <li><a href="${plataforma}/privacidad">${msg("privacidad")}</a></li>
                    <li><a href="${plataforma}/terminos">${msg("terminos")}</a></li>
                </ul>
            </#if>
        </div>
    </footer>
</body>
</html>
</#macro>
