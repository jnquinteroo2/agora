<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username'); section>
    <#if section = "header">
        ${msg("emailForgotTitle")}
    <#elseif section = "form">
        <p class="agora-subtitulo">${msg("emailInstruction")}</p>
        <form id="kc-reset-password-form" class="agora-formulario" data-agora-envio action="${url.loginAction}" method="post" novalidate>
            <div class="agora-grupo">
                <label for="username" class="agora-etiqueta">${msg("usernameOrEmail")}</label>
                <input type="email" id="username" name="username" class="agora-control" autocomplete="username" autocapitalize="none" spellcheck="false" autofocus required
                       value="${(auth.attemptedUsername!'')}"
                       <#if messagesPerField.existsError('username')>aria-invalid="true" aria-describedby="agora-error-usuario"</#if>>
                <#if messagesPerField.existsError('username')>
                    <p id="agora-error-usuario" class="agora-error" role="alert">${kcSanitize(messagesPerField.get('username'))?no_esc}</p>
                </#if>
            </div>
            <button class="agora-boton agora-boton-primario agora-boton-bloque" type="submit">${msg("doSubmit")}</button>
            <a class="agora-enlace" href="${url.loginUrl}">${msg("backToLogin")}</a>
        </form>
    </#if>
</@layout.registrationLayout>
