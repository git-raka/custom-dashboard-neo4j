"use client";

import { ArrowRight, LayoutGrid, Sparkles, Workflow } from "lucide-react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { tw } from "@/lib/tw";
import { AnyRecord } from "@/components/builder/core/types";

type LoginScreenProps = {
  credentials: AnyRecord;
  setCredentials: Dispatch<SetStateAction<AnyRecord>>;
  handleConnect: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isConnecting: boolean;
  bannerError: string;
};

export default function LoginScreen({
  credentials,
  setCredentials,
  handleConnect,
  isConnecting,
  bannerError,
}: LoginScreenProps) {
  return (
    <main className={tw("login-shell")}>
      <section className={tw("hero-panel")}>
        <div className={tw("eyebrow")}>NeoDeck Builder</div>
        <h1 className={tw("hero-title")}>Bangun Dashboard Neo4j dari Data Lokal maupun Remote.</h1>
        <p className={tw("hero-description")}>
          NeoDeck adalah aplikasi dashboard builder untuk Neo4j yang membantu tim menyusun panel data interaktif
          dengan cepat. Bangun layout drag-and-drop, jalankan query Cypher, lalu tampilkan hasil dalam Chart, Table,
          Graph, atau visual lainnya di satu kanvas. Cocok untuk monitoring KPI, eksplorasi relasi data, dan pelaporan
          operasional tanpa alur kerja yang rumit.
        </p>

        <div className={tw("feature-grid")}>
          <article>
            <Sparkles size={18} />
            <strong>Dashboard Builder Workflow</strong>
            <span>Buat banyak dashboard, rename cepat, dan simpan layout per dashboard seperti workflow builder di NeoDash.</span>
          </article>
          <article>
            <LayoutGrid size={18} />
            <strong>Widget Lengkap Untuk Analitik</strong>
            <span>
              Jalankan Cypher untuk widget Stat, Table, dan Graph agar insight angka, detail baris data, dan relasi node
              terlihat dalam satu workspace.
            </span>
          </article>
          <article>
            <Workflow size={18} />
            <strong>Koneksi Direct dan Routed</strong>
            <span>Support `bolt://` (single instance) dan `neo4j://` (cluster routing) dengan fallback mode otomatis saat dibutuhkan.</span>
          </article>
        </div>
      </section>

      <section className={tw("login-panel")}>
        <form className={tw("login-card")} onSubmit={handleConnect}>
          <div className={tw("login-head")}>
            <div>
              <div className={tw("login-eyebrow")}>Connect</div>
              <h2>Masuk ke Neo4j</h2>
            </div>
          </div>

          <label>
            <span>Neo4j URI</span>
            <input
              value={credentials.uri}
              onChange={(event) =>
                setCredentials((current) => ({
                  ...current,
                  uri: event.target.value,
                }))
              }
              placeholder="bolt://192.168.18.16:7687"
            />
          </label>

          <div className={tw("dual-grid")}>
            <label>
              <span>Username</span>
              <input
                value={credentials.username}
                onChange={(event) =>
                  setCredentials((current) => ({
                    ...current,
                    username: event.target.value,
                  }))
                }
                placeholder="neo4j"
              />
            </label>

            <label>
              <span>Database</span>
              <input
                value={credentials.database}
                onChange={(event) =>
                  setCredentials((current) => ({
                    ...current,
                    database: event.target.value,
                  }))
                }
                placeholder="neo4j"
              />
            </label>
          </div>

          <div className={tw("dual-grid")}>
            <label>
              <span>Connection Mode</span>
              <select
                value={credentials.connectionMode}
                onChange={(event) =>
                  setCredentials((current) => ({
                    ...current,
                    connectionMode: event.target.value,
                  }))
                }
              >
                <option value="auto">Auto</option>
                <option value="direct">Direct</option>
                <option value="routing">Routed</option>
              </select>
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                value={credentials.password}
                onChange={(event) =>
                  setCredentials((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder="Masukkan password Neo4j"
              />
            </label>
          </div>

          {bannerError ? <div className={tw("inline-error")}>{bannerError}</div> : null}

          <button className={tw("primary-button login-button")} type="submit">
            {isConnecting ? "Connecting..." : "Connect & Open Builder"}
            <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}
