const APP_SCHEME = "app"
const APP_HOST = "-"
const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`

function registerAppScheme(protocol) {
  protocol.registerSchemesAsPrivileged([{
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  }])
}

function mapAppUrlToUpstream(requestUrl, upstreamUrl) {
  const requested = new URL(requestUrl)
  if (!isAppUrl(requested)) {
    throw new Error(`Unsupported desktop URL: ${requestUrl}`)
  }
  return new URL(`${requested.pathname}${requested.search}`, upstreamUrl).toString()
}

function isAppUrl(value) {
  try {
    const url = value instanceof URL ? value : new URL(value)
    return url.protocol === `${APP_SCHEME}:` && url.host === APP_HOST
  } catch {
    return false
  }
}

function installAppProtocol({ protocol, net, upstreamUrl }) {
  protocol.handle(APP_SCHEME, async (request) => {
    const targetUrl = mapAppUrlToUpstream(request.url, upstreamUrl)
    const headers = new Headers(request.headers)
    const upstreamOrigin = new URL(upstreamUrl).origin
    if (headers.has("origin")) headers.set("origin", upstreamOrigin)
    if (headers.has("referer")) {
      const referer = new URL(headers.get("referer"))
      headers.set("referer", new URL(`${referer.pathname}${referer.search}`, upstreamOrigin).toString())
    }

    const init = {
      method: request.method,
      headers,
      redirect: "follow",
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body
      init.duplex = "half"
    }
    return net.fetch(targetUrl, init)
  })
}

module.exports = {
  APP_ORIGIN,
  isAppUrl,
  installAppProtocol,
  mapAppUrlToUpstream,
  registerAppScheme,
}
