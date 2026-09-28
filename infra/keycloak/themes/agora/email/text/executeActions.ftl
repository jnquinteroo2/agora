<#ftl output_format="plainText">
<#assign requiredActionsText><#if requiredActions??><#list requiredActions><#items as accion>${msg("requiredAction.${accion}")}<#sep><#if accion?index == requiredActions?size - 2> y <#else>, </#if></#sep></#items></#list></#if></#assign>

${msg("executeActionsBody",link, linkExpiration, realmName, requiredActionsText, linkExpirationFormatter(linkExpiration))}
