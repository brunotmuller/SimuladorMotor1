const LOCAL_PART_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i;
const DOMAIN_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const TLD_RE = /^[a-z]{2,}$/i;

const HAS_LETTER_RE = /[A-Za-z]/;
const HAS_DIGIT_RE = /[0-9]/;

export function normalizeEmail(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function isValidEmail(email) {
  if (typeof email !== "string" || email.length === 0 || email.length > 254) {
    return false;
  }

  if (/\s/.test(email)) {
    return false;
  }

  const parts = email.split("@");
  if (parts.length !== 2) {
    return false;
  }

  const [local, domain] = parts;
  if (
    local.length === 0 ||
    local.length > 64 ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..") ||
    !LOCAL_PART_RE.test(local)
  ) {
    return false;
  }

  if (domain.length < 3 || domain.length > 253 || !domain.includes(".")) {
    return false;
  }

  const labels = domain.split(".");
  if (labels.length < 2) {
    return false;
  }

  for (const label of labels) {
    if (!DOMAIN_LABEL_RE.test(label)) {
      return false;
    }
  }

  const tld = labels[labels.length - 1];
  return TLD_RE.test(tld);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateRegisterPayload(body) {
  const input = isPlainObject(body) ? body : {};
  const fields = {};

  const rawName = typeof input.name === "string" ? input.name.trim() : "";
  if (rawName.length === 0) {
    fields.name = "Informe seu nome completo.";
  } else if (rawName.length < 2 || rawName.length > 80) {
    fields.name = "O nome deve ter entre 2 e 80 caracteres.";
  }

  const rawEmail =
    typeof input.email === "string" ? normalizeEmail(input.email) : "";
  if (rawEmail.length === 0) {
    fields.email = "Informe seu e-mail.";
  } else if (!isValidEmail(rawEmail)) {
    fields.email = "Informe um e-mail válido.";
  }

  const rawPassword = typeof input.password === "string" ? input.password : "";
  if (rawPassword.length === 0) {
    fields.password = "Informe uma senha.";
  } else if (rawPassword.length < 8 || rawPassword.length > 72) {
    fields.password = "A senha deve ter entre 8 e 72 caracteres.";
  } else if (!HAS_LETTER_RE.test(rawPassword) || !HAS_DIGIT_RE.test(rawPassword)) {
    fields.password = "A senha deve conter pelo menos 1 letra e 1 dígito.";
  }

  if (Object.keys(fields).length > 0) {
    return { valid: false, fields };
  }

  return {
    valid: true,
    data: {
      name: rawName,
      email: rawEmail,
      password: rawPassword,
    },
  };
}

export function validateLoginPayload(body) {
  const input = isPlainObject(body) ? body : {};
  const fields = {};

  const rawEmail =
    typeof input.email === "string" ? normalizeEmail(input.email) : "";
  if (rawEmail.length === 0) {
    fields.email = "Informe seu e-mail.";
  } else if (!isValidEmail(rawEmail)) {
    fields.email = "Informe um e-mail válido.";
  }

  const rawPassword = typeof input.password === "string" ? input.password : "";
  if (rawPassword.length === 0) {
    fields.password = "Informe sua senha.";
  } else if (rawPassword.length > 72) {
    fields.password = "A senha deve ter no máximo 72 caracteres.";
  }

  if (Object.keys(fields).length > 0) {
    return { valid: false, fields };
  }

  return {
    valid: true,
    data: {
      email: rawEmail,
      password: rawPassword,
    },
  };
}
