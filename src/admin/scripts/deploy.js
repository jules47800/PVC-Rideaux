/**
 * Suivi de la mise en ligne après un enregistrement.
 *
 * Chaque enregistrement crée un commit ; Vercel reconstruit alors le site
 * (environ une minute). /build-info.json indique le commit actuellement en
 * ligne : dès qu'il correspond à l'un des commits faits depuis l'enregistrement
 * attendu, les changements sont visibles.
 */
const POLL_INTERVAL_MS = 5000;
const TIMEOUT_MS = 6 * 60_000;

/** Commits créés depuis cette page, dans l'ordre. */
const commits = [];

export function recordCommit(commit) {
  if (commit) commits.push(commit);
}

/**
 * @param {string} commit commit attendu
 * @returns {Promise<'live' | 'timeout'>}
 */
export async function waitForDeployment(commit) {
  const accepted = () => new Set(commits.slice(commits.indexOf(commit)));
  const deadline = Date.now() + TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    try {
      const response = await fetch(`/build-info.json?t=${Date.now()}`, { cache: 'no-store' });
      const info = response.ok ? await response.json() : {};
      if (info.commit && accepted().has(info.commit)) return 'live';
    } catch {
      // Réseau indisponible un instant : on réessaie.
    }
  }
  return 'timeout';
}
