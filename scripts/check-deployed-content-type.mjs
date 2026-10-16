import { pathToFileURL } from "node:url";

export async function checkDeployedHtml(url, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(`Deployed site returned HTTP ${response.status}.`);
  }
  const responseUrl = new URL(response.url || url);
  if (
    responseUrl.protocol !== "https:" &&
    !["127.0.0.1", "localhost", "::1"].includes(responseUrl.hostname)
  ) {
    throw new Error("The deployed response must remain on HTTPS.");
  }
  const contentType = response.headers.get("content-type")?.trim().toLowerCase();
  if (contentType !== "text/html; charset=utf-8") {
    throw new Error(
      `Expected Content-Type text/html; charset=utf-8, received ${contentType ?? "no Content-Type"}.`,
    );
  }
}

async function main() {
  const deployedUrl = process.env.APPLYFLOW_POST_DEPLOY_URL;
  if (!deployedUrl) {
    throw new Error("Set APPLYFLOW_POST_DEPLOY_URL to the deployed site URL.");
  }
  const target = new URL(deployedUrl);
  if (target.protocol !== "https:") {
    throw new Error("The post-deploy URL must use HTTPS.");
  }
  await checkDeployedHtml(target);
  console.log("Deployed site Content-Type verified.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}