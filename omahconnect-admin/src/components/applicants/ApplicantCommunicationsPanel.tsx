import {
  useEffect,
  useState,
} from "react";

import {
  Mail,
  MessageCircle,
  Send,
} from "lucide-react";

import {
  fetchApplicantCommunicationProviders,
  sendApplicantEmail,
  sendApplicantWhatsApp,
  type ApplicantCommunicationProviders,
  type ApplicantMaster,
} from "../../services/api";


interface ApplicantCommunicationsPanelProps {
  applicant:
    ApplicantMaster;
}


function firstName(
  fullName: string
) {
  return (
    fullName
      .trim()
      .split(/\s+/)[0] ||
    "Applicant"
  );
}


export function normalizeWhatsAppNumber(
  value: string
): string | null {
  const raw =
    String(value ?? "")
      .trim();

  if (!raw) {
    return null;
  }

  let digits = "";

  if (
    raw.startsWith("+")
  ) {
    digits =
      raw.replace(
        /\D/g,
        ""
      );
  } else if (
    raw.startsWith("00")
  ) {
    digits =
      raw
        .slice(2)
        .replace(
          /\D/g,
          ""
        );
  } else {
    /*
     * Do not guess a country code.
     *
     * WhatsApp delivery requires an
     * international-format number.
     */
    return null;
  }

  if (
    digits.length < 8 ||
    digits.length > 15
  ) {
    return null;
  }

  return digits;
}


function errorMessage(
  error: unknown
) {
  if (
    error &&
    typeof error === "object" &&
    "response" in error
  ) {
    const response =
      (
        error as {
          response?: {
            data?: {
              error?: string;
            };
          };
        }
      ).response;

    if (
      typeof response
        ?.data?.error ===
      "string"
    ) {
      return response.data.error;
    }
  }

  return error instanceof Error
    ? error.message
    : "Unexpected error";
}


export function ApplicantCommunicationsPanel({
  applicant,
}: ApplicantCommunicationsPanelProps) {
  const [
    providers,
    setProviders,
  ] = useState<ApplicantCommunicationProviders | null>(
    null
  );

  const [
    providersLoading,
    setProvidersLoading,
  ] = useState(true);

  const [
    providersError,
    setProvidersError,
  ] = useState("");


  useEffect(() => {
    let active =
      true;

    async function loadProviders() {
      try {
        setProvidersLoading(
          true
        );

        setProvidersError(
          ""
        );

        const result =
          await fetchApplicantCommunicationProviders();

        if (active) {
          setProviders(
            result
          );
        }
      } catch (error) {
        if (active) {
          setProvidersError(
            errorMessage(error)
          );
        }
      } finally {
        if (active) {
          setProvidersLoading(
            false
          );
        }
      }
    }

    void loadProviders();

    return () => {
      active =
        false;
    };
  }, []);


  const name =
    applicant.identity
      .fullName
      .trim();

  const email =
    applicant.identity
      .email
      .trim();

  const whatsappSource =
    (
      applicant.identity
        .whatsappNumber ||
      applicant.identity
        .phoneNumber ||
      ""
    ).trim();

  const whatsappNumber =
    normalizeWhatsAppNumber(
      whatsappSource
    );


  const whatsappReady =
    providers?.whatsapp
      .ready === true;


  const [
    emailSubject,
    setEmailSubject,
  ] = useState(
    "OMAH Recruitment"
  );

  const [
    emailBody,
    setEmailBody,
  ] = useState(
    `Dear ${firstName(name)},\n\n\n\nBest regards,\nOMAH Recruitment`
  );

  const [
    emailSending,
    setEmailSending,
  ] = useState(false);

  const [
    emailFeedback,
    setEmailFeedback,
  ] = useState<{
    type:
      | "success"
      | "error";
    message: string;
  } | null>(null);


  const [
    whatsappMessage,
    setWhatsappMessage,
  ] = useState(
    `Hello ${firstName(name)},\n\nThis is OMAH Recruitment regarding your application.`
  );

  const [
    whatsappSending,
    setWhatsappSending,
  ] = useState(false);

  const [
    whatsappFeedback,
    setWhatsappFeedback,
  ] = useState<{
    type:
      | "success"
      | "error";
    message: string;
  } | null>(null);


  async function handleSendEmail() {
    setEmailFeedback(
      null
    );

    if (!email) {
      setEmailFeedback({
        type: "error",
        message:
          "This Applicant does not have an email address.",
      });

      return;
    }

    if (
      !emailSubject.trim()
    ) {
      setEmailFeedback({
        type: "error",
        message:
          "Email subject is required.",
      });

      return;
    }

    if (
      !emailBody.trim()
    ) {
      setEmailFeedback({
        type: "error",
        message:
          "Email message is required.",
      });

      return;
    }

    if (
      !window.confirm(
        `Send this email to ${email}?`
      )
    ) {
      return;
    }

    try {
      setEmailSending(
        true
      );

      const result =
        await sendApplicantEmail(
          applicant._id,
          {
            subject:
              emailSubject.trim(),

            body:
              emailBody.trim(),
          }
        );

      setEmailFeedback({
        type: "success",
        message:
          `Email sent successfully to ${result.recipient.email}.`,
      });
    } catch (error) {
      setEmailFeedback({
        type: "error",
        message:
          errorMessage(error),
      });
    } finally {
      setEmailSending(
        false
      );
    }
  }


  async function handleSendWhatsApp() {
    setWhatsappFeedback(
      null
    );

    if (
      !whatsappReady
    ) {
      setWhatsappFeedback({
        type: "error",
        message:
          "WhatsApp Business integration is not configured yet.",
      });

      return;
    }

    if (
      !whatsappSource
    ) {
      setWhatsappFeedback({
        type: "error",
        message:
          "This Applicant does not have a WhatsApp or phone number.",
      });

      return;
    }

    if (
      !whatsappNumber
    ) {
      setWhatsappFeedback({
        type: "error",
        message:
          "The Applicant phone number must be stored in international format, for example +961...",
      });

      return;
    }

    if (
      !whatsappMessage.trim()
    ) {
      setWhatsappFeedback({
        type: "error",
        message:
          "WhatsApp message is required.",
      });

      return;
    }

    if (
      !window.confirm(
        `Send this WhatsApp message to ${whatsappSource}?`
      )
    ) {
      return;
    }

    try {
      setWhatsappSending(
        true
      );

      const result =
        await sendApplicantWhatsApp(
          applicant._id,
          {
            message:
              whatsappMessage.trim(),
          }
        );

      setWhatsappFeedback({
        type: "success",
        message:
          `WhatsApp message sent successfully to ${result.recipient.whatsappNumber}.`,
      });
    } catch (error) {
      setWhatsappFeedback({
        type: "error",
        message:
          errorMessage(error),
      });
    } finally {
      setWhatsappSending(
        false
      );
    }
  }


  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">
          Applicant Communications
        </h3>

        <p className="mt-1 text-xs text-slate-400">
          Contact this Applicant directly using the email address and WhatsApp number stored on their current profile.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Applicant
            </p>

            <p className="mt-1 text-xs font-bold text-slate-800">
              {name || "—"}
            </p>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Recruitment Status
            </p>

            <p className="mt-1 text-xs font-bold text-slate-800">
              {
                applicant
                  .recruitment
                  .status
              }
            </p>
          </div>
        </div>
      </div>


      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Mail className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Email
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                Send an email directly to this Applicant.
              </p>
            </div>
          </div>


          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                To
              </span>

              <input
                value={
                  email ||
                  "No email available"
                }
                readOnly
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
              />
            </label>


            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Subject
              </span>

              <input
                value={
                  emailSubject
                }
                onChange={(
                  event
                ) =>
                  setEmailSubject(
                    event.target
                      .value
                  )
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </label>


            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Message
              </span>

              <textarea
                rows={9}
                value={
                  emailBody
                }
                onChange={(
                  event
                ) =>
                  setEmailBody(
                    event.target
                      .value
                  )
                }
                className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-xs leading-relaxed text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </label>


            {emailFeedback && (
              <div
                className={
                  `rounded-lg border px-3 py-2 text-xs ${
                    emailFeedback
                      .type ===
                    "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`
                }
              >
                {
                  emailFeedback
                    .message
                }
              </div>
            )}


            <button
              type="button"
              disabled={
                emailSending ||
                !email
              }
              onClick={() =>
                void handleSendEmail()
              }
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />

              {
                emailSending
                  ? "Sending..."
                  : "Send Email"
              }
            </button>
          </div>
        </section>


        <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <MessageCircle className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                WhatsApp
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                Send a WhatsApp message directly to this Applicant.
              </p>
            </div>
          </div>


          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                To
              </span>

              <input
                value={
                  whatsappSource ||
                  "No WhatsApp number available"
                }
                readOnly
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
              />

              {whatsappSource &&
                !whatsappNumber && (
                  <p className="mt-1 text-[10px] text-amber-600">
                    Store this number in international format, such as +961..., before sending WhatsApp.
                  </p>
                )}
            </label>


            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Message
              </span>

              <textarea
                rows={9}
                value={
                  whatsappMessage
                }
                onChange={(
                  event
                ) =>
                  setWhatsappMessage(
                    event.target
                      .value
                  )
                }
                className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-xs leading-relaxed text-slate-700 focus:border-emerald-500 focus:outline-none"
              />
            </label>


            {whatsappFeedback && (
              <div
                className={
                  `rounded-lg border px-3 py-2 text-xs ${
                    whatsappFeedback
                      .type ===
                    "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`
                }
              >
                {
                  whatsappFeedback
                    .message
                }
              </div>
            )}


            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  WhatsApp Business
                </span>

                {providersLoading ? (
                  <span className="text-[10px] font-semibold text-slate-400">
                    Checking...
                  </span>
                ) : whatsappReady ? (
                  <span className="text-[10px] font-bold text-emerald-600">
                    Connected
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-600">
                    Not configured
                  </span>
                )}
              </div>

              {providersError && (
                <p className="mt-1 text-[10px] text-rose-600">
                  {providersError}
                </p>
              )}
            </div>


            <button
              type="button"
              disabled={
                whatsappSending ||
                providersLoading ||
                !whatsappReady ||
                !whatsappSource ||
                !whatsappNumber
              }
              onClick={() =>
                void handleSendWhatsApp()
              }
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />

              {
                whatsappSending
                  ? "Sending..."
                  : "Send WhatsApp"
              }
            </button>


            <p className="text-[10px] leading-relaxed text-slate-400">
              The message is sent directly through the configured OMAH WhatsApp Business provider. WhatsApp does not open in the browser.
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}
