<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('password','password-confirm'); section>
    <#if section = "header">
        ${msg("updatePasswordTitle")}
    <#elseif section = "form">
        <form id="kc-passwd-update-form" class="agora-formulario" data-agora-envio action="${url.loginAction}" method="post" novalidate>
            <div class="agora-grupo">
                <label for="password-new" class="agora-etiqueta">${msg("passwordNew")}</label>
                <p id="agora-ayuda-clave" class="agora-ayuda">${msg("passwordNewHelp")}</p>
                <input type="password" id="password-new" name="password-new" class="agora-control" autocomplete="new-password" autofocus required
                       aria-describedby="agora-ayuda-clave<#if messagesPerField.existsError('password')> agora-error-clave</#if>"
                       <#if messagesPerField.existsError('password','password-confirm')>aria-invalid="true"</#if>>
                <#if messagesPerField.existsError('password')>
                    <p id="agora-error-clave" class="agora-error" role="alert">${kcSanitize(messagesPerField.get('password'))?no_esc}</p>
                </#if>
            </div>
            <div class="agora-grupo">
                <label for="password-confirm" class="agora-etiqueta">${msg("passwordConfirm")}</label>
                <input type="password" id="password-confirm" name="password-confirm" class="agora-control" autocomplete="new-password" required
                       <#if messagesPerField.existsError('password-confirm')>aria-invalid="true" aria-describedby="agora-error-confirmacion"</#if>>
                <#if messagesPerField.existsError('password-confirm')>
                    <p id="agora-error-confirmacion" class="agora-error" role="alert">${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}</p>
                </#if>
            </div>
            <label class="agora-casilla-grupo">
                <input type="checkbox" id="logout-sessions" name="logout-sessions" value="on" checked class="agora-casilla">
                <span>${msg("logoutOtherSessions")}</span>
            </label>
            <button class="agora-boton agora-boton-primario agora-boton-bloque" type="submit">${msg("doSubmit")}</button>
            <#if isAppInitiatedAction??>
                <button class="agora-boton agora-boton-secundario agora-boton-bloque" type="submit" name="cancel-aia" value="true">${msg("doCancel")}</button>
            </#if>
        </form>
    </#if>
</@layout.registrationLayout>
