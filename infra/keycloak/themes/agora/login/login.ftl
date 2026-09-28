<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=true; section>
    <#if section = "header">
        ${msg("loginAccountTitle")}
    <#elseif section = "form">
        <p class="agora-subtitulo">${msg("loginAccountSubtitle")}</p>
        <#if realm.password>
            <#assign hayError = messagesPerField.existsError('username','password')>
            <#if hayError>
                <p id="agora-error-credenciales" class="agora-aviso agora-aviso-error" role="alert" tabindex="-1">${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}</p>
            </#if>
            <form id="kc-form-login" class="agora-formulario" data-agora-envio action="${url.loginAction}" method="post" novalidate>
                <#if !usernameHidden??>
                    <div class="agora-grupo">
                        <label for="username" class="agora-etiqueta">${msg("usernameOrEmail")}</label>
                        <input id="username" class="agora-control" name="username" value="${(login.username!'')}" type="email"
                               autocomplete="username" autocapitalize="none" spellcheck="false" autofocus required
                               <#if hayError>aria-invalid="true" aria-describedby="agora-error-credenciales"</#if>>
                    </div>
                </#if>
                <div class="agora-grupo">
                    <label for="password" class="agora-etiqueta">${msg("password")}</label>
                    <div class="agora-control-grupo">
                        <input id="password" class="agora-control agora-control-con-boton" name="password" type="password"
                               autocomplete="current-password" required
                               <#if hayError>aria-invalid="true" aria-describedby="agora-error-credenciales"</#if>>
                        <button class="agora-ver-clave" type="button" aria-controls="password" aria-pressed="false"
                                aria-label="${msg('showPassword')}" data-agora-ver-clave
                                data-etiqueta-mostrar="${msg('showPassword')}" data-etiqueta-ocultar="${msg('hidePassword')}">
                            <span class="agora-icono-ojo" aria-hidden="true"></span>
                        </button>
                    </div>
                </div>
                <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>>
                <button class="agora-boton agora-boton-primario agora-boton-bloque" name="login" id="kc-login" type="submit">${msg("doLogIn")}</button>
                <#if realm.resetPasswordAllowed>
                    <a class="agora-enlace" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a>
                </#if>
            </form>
        </#if>
    <#elseif section = "info">
        <p class="agora-nota">${msg("noAccountInfo")}</p>
    </#if>
</@layout.registrationLayout>
