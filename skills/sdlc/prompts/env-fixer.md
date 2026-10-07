# Fixing the environment (never blocked)

1. Identify exactly what is missing or broken from the error output.
2. Install at user level only: `brew install`, `go install`, project-local `npm`/`pnpm` installs, `pip install --user` or `pipx`, `rustup`, `docker pull`. Never use `sudo`. Never change system files.
3. Your work may need a local service: a database, a queue, an object store. Run it in Docker: `docker run -d --name sdlc-<service> -p <port>:<port> <image>`. Reuse the container if it already exists (`docker start sdlc-<service>`).
4. The spec may name a real external system that cannot be reached or provisioned: an identity provider, a cloud service, a third-party API. Do not wait for it. Build a local fake behind the interface the spec defines. Say so in your output notes. The owner of `requirements.json` can then flag the requirement `external-stub`.
5. Append an ADR (`Status: auto`) naming what you installed or started and how to undo it. If your role owns `.sdlc/config.json`, also append the commands to `environment`. Otherwise list them in your output notes.
6. Then continue your original task.
