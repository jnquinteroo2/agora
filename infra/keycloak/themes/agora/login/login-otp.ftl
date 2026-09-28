<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('totp'); section>
    <#if section = "header">
        ${msg("loginOtpTitle")}
    <#elseif section = "form">
        <p class="agora-subtitulo">${msg("loginOtpSubtitle")}</p>
        <form id="kc-otp-login-form" class="agora-formulario" data-agora-envio action="${url.loginAction}" method="post" novalidate>
            <#if otpLogin.userOtpCredentials?size gt 1>
                <fieldset class="agora-grupo">
                    <legend class="agora-etiqueta">${msg("loginTotpDeviceName")}</legend>
                    <#list otpLogin.userOtpCredentials as otpCredential>
                        <label class="agora-radio">
                            <input class="agora-radio-control" type="radio" name="selectedCredentialId" value="${otpCredential.id}" <#if otpCredential.id == otpLogin.selectedCredentialId>checked</#if>>
                            <span>${otpCredential.userLabel}</span>
                        </label>
                    </#list>
                </fieldset>
            </#if>
            <div class="agora-grupo">
                <label for="otp" class="agora-etiqueta">${msg("loginOtpOneTime")}</label>
                <input id="otp" name="otp" autocomplete="one-time-code" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6"
                       class="agora-control agora-control-codigo" autofocus required
                       <#if messagesPerField.existsError('totp')>aria-invalid="true" aria-describedby="agora-error-otp"</#if>>
                <#if messagesPerField.existsError('totp')>
                    <p id="agora-error-otp" class="agora-error" role="alert">${kcSanitize(messagesPerField.get('totp'))?no_esc}</p>
                </#if>
            </div>
            <button class="agora-boton agora-boton-primario agora-boton-bloque" name="login" id="kc-login" type="submit">${msg("doLogIn")}</button>
        </form>
    </#if>
</@layout.registrationLayout>
