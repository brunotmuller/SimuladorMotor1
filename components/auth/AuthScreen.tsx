import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthClientError } from "@/lib/auth/authClient";
import { useAuth } from "@/lib/auth/AuthContext";

type AuthMode = "login" | "register";

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function formatRetryWait(seconds: number): string {
  if (seconds >= 60) {
    const minutes = Math.ceil(seconds / 60);
    return minutes === 1
      ? "aproximadamente 1 minuto"
      : `aproximadamente ${minutes} minutos`;
  }
  return seconds === 1 ? "1 segundo" : `${seconds} segundos`;
}

function validateForm(
  mode: AuthMode,
  values: { name: string; email: string; password: string }
): FieldErrors {
  const errors: FieldErrors = {};

  if (mode === "register") {
    const trimmedName = values.name.trim();
    if (!trimmedName) {
      errors.name = "Informe seu nome completo.";
    } else if (trimmedName.length < 2 || trimmedName.length > 80) {
      errors.name = "O nome deve ter entre 2 e 80 caracteres.";
    }
  }

  const normalizedEmail = values.email.trim().toLowerCase();
  if (!normalizedEmail) {
    errors.email = "Informe seu e-mail.";
  } else if (!EMAIL_REGEX.test(normalizedEmail)) {
    errors.email = "Informe um e-mail válido.";
  }

  if (mode === "register") {
    if (!values.password) {
      errors.password = "Crie uma senha para sua conta.";
    } else if (values.password.length < 8 || values.password.length > 72) {
      errors.password = "A senha deve ter entre 8 e 72 caracteres.";
    } else if (!/[A-Za-z]/.test(values.password) || !/[0-9]/.test(values.password)) {
      errors.password = "A senha deve conter ao menos 1 letra e 1 número.";
    }
  } else if (!values.password) {
    errors.password = "Informe sua senha.";
  }

  return errors;
}

export default function AuthScreen() {
  const { signIn, signUp, enterGuestMode, bootError, retryRestoreSession } =
    useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [retryWaitText, setRetryWaitText] = useState<string | null>(null);
  const [canRetrySubmit, setCanRetrySubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [retryingBoot, setRetryingBoot] = useState(false);

  function switchMode(nextMode: AuthMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    setFieldErrors({});
    setFormError(null);
    setRetryWaitText(null);
    setCanRetrySubmit(false);
  }

  function clearFieldError(field: keyof FieldErrors) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (formError) {
      setFormError(null);
      setRetryWaitText(null);
      setCanRetrySubmit(false);
    }
  }

  async function handleRetryBoot() {
    if (retryingBoot) return;
    setRetryingBoot(true);
    try {
      await retryRestoreSession();
    } finally {
      setRetryingBoot(false);
    }
  }

  async function handleSubmit() {
    if (submitting) return;

    const validationErrors = validateForm(mode, { name, email, password });
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setFormError("Revise os campos destacados antes de continuar.");
      setRetryWaitText(null);
      setCanRetrySubmit(false);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setRetryWaitText(null);
    setCanRetrySubmit(false);
    setSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (mode === "login") {
        await signIn({ email: normalizedEmail, password });
      } else {
        await signUp({
          name: name.trim(),
          email: normalizedEmail,
          password,
        });
      }
    } catch (error) {
      if (error instanceof AuthClientError) {
        if (error.fields) {
          setFieldErrors({
            name: error.fields.name,
            email: error.fields.email,
            password: error.fields.password,
          });
        } else if (error.status === 409) {
          setFieldErrors({ email: error.message });
        }

        if (error.status === 429 && error.retryAfterSeconds !== undefined) {
          setRetryWaitText(formatRetryWait(error.retryAfterSeconds));
        }

        setFormError(error.message);
        setCanRetrySubmit(Boolean(error.isTimeout || error.isNetworkError));
      } else {
        setFormError(
          "Não foi possível concluir a solicitação. Tente novamente."
        );
        setCanRetrySubmit(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const hasMinLength = password.length >= 8 && password.length <= 72;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);

  return (
    <KeyboardAvoidingView
      style={authStyles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={authStyles.scroll}
        contentContainerStyle={authStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={authStyles.card}>
          <View style={authStyles.header}>
            <Image
              source={require("../../assets/images/torquelab-logo.png")}
              style={authStyles.logo}
              resizeMode="contain"
              accessibilityLabel="TorqueLab"
            />
            <Text style={authStyles.eyebrow}>ACESSO À GARAGEM INTELIGENTE</Text>
            <Text style={authStyles.title}>
              {mode === "login"
                ? "Entre na sua conta TorqueLab"
                : "Crie sua conta gratuita"}
            </Text>
            <Text style={authStyles.subtitle}>
              {mode === "login"
                ? "Acompanhe veículos, histórico de manutenções e simulações protegidas no seu perfil."
                : "Cadastre-se para organizar múltiplos carros, alertas preventivos e histórico completo."}
            </Text>
          </View>

          {bootError && (
            <View style={authStyles.bootBanner} accessibilityRole="alert">
              <Ionicons
                name="cloud-offline-outline"
                size={18}
                color="#fcd34d"
              />
              <View style={authStyles.bannerTextWrap}>
                <Text style={authStyles.bootBannerTitle}>
                  Não foi possível restaurar sua sessão
                </Text>
                <Text style={authStyles.bootBannerText}>{bootError}</Text>
              </View>
              <TouchableOpacity
                onPress={handleRetryBoot}
                disabled={retryingBoot}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={authStyles.retrySmallBtn}
              >
                {retryingBoot ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={authStyles.retrySmallBtnText}>
                    Tentar novamente
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={authStyles.tabsRow}>
            <TouchableOpacity
              onPress={() => switchMode("login")}
              activeOpacity={0.85}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === "login" }}
              style={[
                authStyles.tabBtn,
                mode === "login" && authStyles.tabBtnActive,
              ]}
            >
              <Ionicons
                name="log-in-outline"
                size={16}
                color={mode === "login" ? "#ffffff" : "#b9adb2"}
              />
              <Text
                style={[
                  authStyles.tabText,
                  mode === "login" && authStyles.tabTextActive,
                ]}
              >
                Entrar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => switchMode("register")}
              activeOpacity={0.85}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === "register" }}
              style={[
                authStyles.tabBtn,
                mode === "register" && authStyles.tabBtnActive,
              ]}
            >
              <Ionicons
                name="person-add-outline"
                size={16}
                color={mode === "register" ? "#ffffff" : "#b9adb2"}
              />
              <Text
                style={[
                  authStyles.tabText,
                  mode === "register" && authStyles.tabTextActive,
                ]}
              >
                Criar conta
              </Text>
            </TouchableOpacity>
          </View>

          <View style={authStyles.form}>
            {mode === "register" && (
              <View style={authStyles.fieldGroup}>
                <Text style={authStyles.label}>Nome completo</Text>
                <View
                  style={[
                    authStyles.inputWrap,
                    fieldErrors.name && authStyles.inputWrapError,
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={17}
                    color="#9c8f95"
                    style={authStyles.inputIcon}
                  />
                  <TextInput
                    style={authStyles.input}
                    value={name}
                    onChangeText={(value) => {
                      setName(value);
                      clearFieldError("name");
                    }}
                    placeholder="Ex.: Bruno Silva"
                    placeholderTextColor="#6e646a"
                    autoCapitalize="words"
                    autoComplete="name"
                    returnKeyType="next"
                    editable={!submitting}
                    accessibilityLabel="Nome completo"
                  />
                </View>
                {fieldErrors.name && (
                  <Text style={authStyles.fieldErrorText}>
                    {fieldErrors.name}
                  </Text>
                )}
              </View>
            )}

            <View style={authStyles.fieldGroup}>
              <Text style={authStyles.label}>E-mail</Text>
              <View
                style={[
                  authStyles.inputWrap,
                  fieldErrors.email && authStyles.inputWrapError,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={17}
                  color="#9c8f95"
                  style={authStyles.inputIcon}
                />
                <TextInput
                  style={authStyles.input}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    clearFieldError("email");
                  }}
                  placeholder="voce@exemplo.com"
                  placeholderTextColor="#6e646a"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  returnKeyType="next"
                  editable={!submitting}
                  accessibilityLabel="E-mail"
                />
              </View>
              {fieldErrors.email && (
                <Text style={authStyles.fieldErrorText}>
                  {fieldErrors.email}
                </Text>
              )}
            </View>

            <View style={authStyles.fieldGroup}>
              <Text style={authStyles.label}>Senha</Text>
              <View
                style={[
                  authStyles.inputWrap,
                  fieldErrors.password && authStyles.inputWrapError,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={17}
                  color="#9c8f95"
                  style={authStyles.inputIcon}
                />
                <TextInput
                  style={authStyles.input}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    clearFieldError("password");
                  }}
                  placeholder={
                    mode === "register"
                      ? "Mínimo 8 caracteres (letras e números)"
                      : "Digite sua senha"
                  }
                  placeholderTextColor="#6e646a"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  editable={!submitting}
                  accessibilityLabel="Senha"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={authStyles.eyeBtn}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? "Ocultar senha" : "Mostrar senha"
                  }
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#a99ca2"
                  />
                </TouchableOpacity>
              </View>
              {fieldErrors.password && (
                <Text style={authStyles.fieldErrorText}>
                  {fieldErrors.password}
                </Text>
              )}

              {mode === "register" && (
                <View style={authStyles.passwordRulesRow}>
                  <View
                    style={[
                      authStyles.rulePill,
                      hasMinLength && authStyles.rulePillOk,
                    ]}
                  >
                    <Ionicons
                      name={
                        hasMinLength
                          ? "checkmark-circle"
                          : "ellipse-outline"
                      }
                      size={12}
                      color={hasMinLength ? "#86efac" : "#8f8288"}
                    />
                    <Text
                      style={[
                        authStyles.rulePillText,
                        hasMinLength && authStyles.rulePillTextOk,
                      ]}
                    >
                      8–72 caracteres
                    </Text>
                  </View>

                  <View
                    style={[
                      authStyles.rulePill,
                      hasLetter && authStyles.rulePillOk,
                    ]}
                  >
                    <Ionicons
                      name={
                        hasLetter ? "checkmark-circle" : "ellipse-outline"
                      }
                      size={12}
                      color={hasLetter ? "#86efac" : "#8f8288"}
                    />
                    <Text
                      style={[
                        authStyles.rulePillText,
                        hasLetter && authStyles.rulePillTextOk,
                      ]}
                    >
                      1 letra
                    </Text>
                  </View>

                  <View
                    style={[
                      authStyles.rulePill,
                      hasDigit && authStyles.rulePillOk,
                    ]}
                  >
                    <Ionicons
                      name={hasDigit ? "checkmark-circle" : "ellipse-outline"}
                      size={12}
                      color={hasDigit ? "#86efac" : "#8f8288"}
                    />
                    <Text
                      style={[
                        authStyles.rulePillText,
                        hasDigit && authStyles.rulePillTextOk,
                      ]}
                    >
                      1 número
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {formError && (
              <View style={authStyles.errorAlert} accessibilityRole="alert">
                <Ionicons name="alert-circle" size={18} color="#fca5a5" />
                <View style={authStyles.bannerTextWrap}>
                  <Text style={authStyles.errorAlertText}>{formError}</Text>
                  {retryWaitText && (
                    <Text style={authStyles.retryWaitHint}>
                      Aguarde {retryWaitText} antes de tentar novamente.
                    </Text>
                  )}
                </View>
                {canRetrySubmit && (
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={submitting}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    style={authStyles.retrySmallBtn}
                  >
                    <Text style={authStyles.retrySmallBtnText}>
                      Tentar novamente
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={[
                authStyles.submitBtn,
                submitting && authStyles.submitBtnDisabled,
              ]}
            >
              {submitting ? (
                <>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={authStyles.submitBtnText}>
                    {mode === "login" ? "Entrando..." : "Criando conta..."}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={authStyles.submitBtnText}>
                    {mode === "login" ? "Entrar" : "Criar conta"}
                  </Text>
                  <Ionicons name="arrow-forward" size={17} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={authStyles.dividerRow}>
            <View style={authStyles.dividerLine} />
            <Text style={authStyles.dividerText}>ou</Text>
            <View style={authStyles.dividerLine} />
          </View>

          <View style={authStyles.guestSection}>
            <TouchableOpacity
              onPress={enterGuestMode}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={authStyles.guestBtn}
            >
              <Ionicons name="car-outline" size={17} color="#efe5e8" />
              <Text style={authStyles.guestBtnText}>
                Continuar como visitante (modo demonstração)
              </Text>
            </TouchableOpacity>

            <Text style={authStyles.guestHint}>
              Visitantes podem testar o simulador FIPE e o assistente em
              demonstração local. Crie sua conta para manter sua garagem e
              histórico separados e sincronizados por perfil.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const authStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#09090c",
  },
  scroll: {
    flex: 1,
    backgroundColor: "#09090c",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  card: {
    width: "100%",
    maxWidth: 468,
    backgroundColor: "#121118",
    borderWidth: 1,
    borderColor: "rgba(228, 59, 85, 0.28)",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000000",
    shadowOpacity: 0.45,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    height: 54,
    width: 152,
    marginBottom: 14,
  },
  eyebrow: {
    color: "#ff6b7f",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  title: {
    color: "#ffffff",
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    color: "#b7aab0",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 6,
  },
  bootBanner: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.36)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  bannerTextWrap: {
    flex: 1,
    minWidth: 160,
  },
  bootBannerTitle: {
    color: "#fde68a",
    fontSize: 12,
    fontWeight: "800",
  },
  bootBannerText: {
    color: "#fef3c7",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#191722",
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 4,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: "#e43b55",
  },
  tabText: {
    color: "#b9adb2",
    fontSize: 13,
    fontWeight: "800",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  form: {
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    color: "#dfd4d8",
    fontSize: 12,
    fontWeight: "700",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#191722",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputWrapError: {
    borderColor: "rgba(239, 68, 68, 0.72)",
    backgroundColor: "rgba(239, 68, 68, 0.06)",
  },
  inputIcon: {
    marginRight: 9,
  },
  input: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 12,
  },
  eyeBtn: {
    padding: 6,
    marginLeft: 4,
  },
  fieldErrorText: {
    color: "#fca5a5",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  passwordRulesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  rulePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#181621",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  rulePillOk: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderColor: "rgba(34, 197, 94, 0.35)",
  },
  rulePillText: {
    color: "#9c8f95",
    fontSize: 11,
    fontWeight: "700",
  },
  rulePillTextOk: {
    color: "#86efac",
  },
  errorAlert: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    backgroundColor: "rgba(239, 68, 68, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.42)",
    borderRadius: 12,
    padding: 12,
  },
  errorAlertText: {
    color: "#fecaca",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  retryWaitHint: {
    color: "#fde68a",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  retrySmallBtn: {
    backgroundColor: "#e43b55",
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  retrySmallBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  submitBtn: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#e43b55",
    borderRadius: 13,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  submitBtnDisabled: {
    opacity: 0.72,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  dividerText: {
    color: "#8f8288",
    fontSize: 12,
    fontWeight: "700",
  },
  guestSection: {
    gap: 10,
  },
  guestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1a1722",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  guestBtnText: {
    color: "#efe5e8",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  guestHint: {
    color: "#968a90",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
