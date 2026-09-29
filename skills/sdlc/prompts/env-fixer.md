# Fixing the environment (never blocked)

1. Identify exactly what is missing or broken from the error output.
2. Install at user level only: `brew install`, `go install`, project-local `npm`/`pnpm` installs, `pip install --user` or `pipx`, `rustup`, `docker pull`. Never use `sudo`. Never change system files.
3. When a local service is needed (database, queue, object store), run it in Docker: `docker run -d --name sdlc-<service> -p <port>:<port> <image>`. Reuse the container if it already exists (`docker start sdlc-<service>`).
4. When a real external system cannot be reached or provisioned (identity provider, cloud service, third-party API), do not wait for it. Build a local fake behind the interface the spec defines, and say so in your output notes so the owner of `requirements.json` can flag the requirement `external-stub`.
5. Append an ADR (`Status: auto`) naming what you installed or started and how to undo it. If your role owns `.sdlc/config.json`, also append the commands to `environment`. Otherwise list them in your output notes.
6. Then continue your original task.
