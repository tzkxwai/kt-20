(function () {
  const storageKey = "jwtChatToken";
  let token = sessionStorage.getItem(storageKey) || "";
  let connection = null;

  const regForm = document.getElementById("formRegister");
  const loginForm = document.getElementById("formLogin");
  const formSend = document.getElementById("formSend");
  const chatPanel = document.getElementById("chatPanel");
  const messagesEl = document.getElementById("messages");
  const userLabel = document.getElementById("userLabel");
  const regStatus = document.getElementById("regStatus");
  const loginStatus = document.getElementById("loginStatus");

  function setStatus(el, text, ok) {
    el.textContent = text || "";
    el.classList.remove("err", "ok");
    if (text) el.classList.add(ok ? "ok" : "err");
  }

  function showChat(userName) {
    chatPanel.classList.remove("hidden");
    userLabel.textContent = userName ? "Вы: " + userName : "";
  }

  function hideChat() {
    chatPanel.classList.add("hidden");
    userLabel.textContent = "";
    messagesEl.innerHTML = "";
  }

  async function startHub() {
    if (connection) {
      await connection.stop();
      connection = null;
    }
    if (!token) return;

    connection = new signalR.HubConnectionBuilder()
      .withUrl("/hubs/chat", {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveMessage", (user, text) => {
      const line = document.createElement("div");
      line.className = "msg";
      line.innerHTML = "<b>" + escapeHtml(user) + "</b>: " + escapeHtml(text);
      messagesEl.appendChild(line);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });

    connection.onreconnecting(() => {
      appendSystem("Переподключение…");
    });
    connection.onreconnected(() => {
      appendSystem("Снова в сети.");
    });
    connection.onclose(() => {
      appendSystem("Соединение закрыто.");
    });

    try {
      await connection.start();
      appendSystem("Подключено к чату (JWT принят).");
    } catch (e) {
      appendSystem("Ошибка подключения: " + (e.message || e));
    }
  }

  function appendSystem(text) {
    const line = document.createElement("div");
    line.className = "msg";
    line.style.color = "#9aa0a6";
    line.textContent = "[система] " + text;
    messagesEl.appendChild(line);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function nameFromJwt(jwt) {
    try {
      const payload = jwt.split(".")[1];
      const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(
        Array.prototype.map
          .call(atob(b64), (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const o = JSON.parse(json);
      return o.unique_name || o.email || o.sub || "";
    } catch {
      return "";
    }
  }

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, data };
    return data;
  }

  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus(regStatus, "");
    try {
      const email = document.getElementById("regEmail").value.trim();
      const password = document.getElementById("regPassword").value;
      const r = await postJson("/api/auth/register", { email, password });
      token = r.token;
      sessionStorage.setItem(storageKey, token);
      setStatus(regStatus, "Аккаунт создан, токен получен.", true);
      setStatus(loginStatus, "");
      showChat(r.userName);
      messagesEl.innerHTML = "";
      await startHub();
    } catch (err) {
      const msg =
        err.data?.errors?.join?.(" ") ||
        err.data?.error ||
        "Ошибка регистрации.";
      setStatus(regStatus, msg, false);
    }
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus(loginStatus, "");
    try {
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;
      const r = await postJson("/api/auth/login", { email, password });
      token = r.token;
      sessionStorage.setItem(storageKey, token);
      setStatus(loginStatus, "Вход выполнен, JWT выдан.", true);
      setStatus(regStatus, "");
      showChat(r.userName);
      messagesEl.innerHTML = "";
      await startHub();
    } catch (err) {
      setStatus(
        loginStatus,
        err.data?.error || "Неверные данные или ошибка сервера.",
        false
      );
    }
  });

  formSend.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("messageText");
    const text = input.value.trim();
    if (!text || !connection) return;
    try {
      await connection.invoke("SendMessage", text);
      input.value = "";
    } catch (err) {
      appendSystem("Не удалось отправить: " + (err.message || err));
    }
  });

  document.getElementById("btnLogout").addEventListener("click", async () => {
    token = "";
    sessionStorage.removeItem(storageKey);
    if (connection) {
      await connection.stop();
      connection = null;
    }
    hideChat();
    setStatus(loginStatus, "Вы вышли.", true);
  });

  if (token) {
    showChat(nameFromJwt(token) || "пользователь");
    startHub();
  }
})();
