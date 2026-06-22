"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

const contactEmail = "shaquxn@gmail.com";
const maxImageCount = 3;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SelectedImage = {
  id: string;
  file: File;
  previewUrl: string;
};

function createSelectedImage(file: File): SelectedImage {
  return {
    id: `${file.name}-${file.lastModified}-${file.size}-${crypto.randomUUID()}`,
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

function openMailFallback({
  email,
  imageNames,
  message,
  subject,
}: {
  email: string;
  imageNames: string[];
  message: string;
  subject: string;
}) {
  const body = [
    email ? `From: ${email}` : null,
    imageNames.length
      ? `Images selected: ${imageNames.join(", ")}`
      : null,
    message,
  ]
    .filter(Boolean)
    .join("\n\n");

  window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

export function ContactModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "fallback" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const emailInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedImagesRef = useRef<SelectedImage[]>([]);

  useEffect(() => {
    selectedImagesRef.current = selectedImages;
  }, [selectedImages]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      selectedImagesRef.current.forEach((image) => {
        URL.revokeObjectURL(image.previewUrl);
      });
    };
  }, []);

  function clearFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function validateEmail(value: string) {
    if (!value || emailPattern.test(value)) {
      setEmailError("");
      return true;
    }

    setEmailError("Enter a valid email address.");
    return false;
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) {
      return;
    }

    const availableSlots = maxImageCount - selectedImages.length;
    const nextImages = files
      .slice(0, Math.max(0, availableSlots))
      .map(createSelectedImage);

    if (nextImages.length) {
      setSelectedImages((currentImages) => [...currentImages, ...nextImages]);
    }

    if (files.length > availableSlots) {
      setStatus("error");
      setErrorMessage(`You can attach up to ${maxImageCount} images.`);
    } else {
      setStatus("idle");
      setErrorMessage("");
    }

    clearFileInput();
  }

  function removeImage(imageId: string) {
    setSelectedImages((currentImages) => {
      const imageToRemove = currentImages.find((image) => image.id === imageId);

      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }

      return currentImages.filter((image) => image.id !== imageId);
    });

    clearFileInput();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const subject = String(formData.get("subject") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const imageNames = selectedImages.map((image) => image.file.name);

    formData.delete("image");
    selectedImages.forEach((image) => {
      formData.append("image", image.file);
    });

    if (!subject || !message) {
      setStatus("error");
      setErrorMessage("Subject and message are required.");
      return;
    }

    if (!validateEmail(email)) {
      emailInputRef.current?.focus();
      return;
    }

    setStatus("sending");
    setErrorMessage("");
    setEmailError("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        form.reset();
        selectedImages.forEach((image) => {
          URL.revokeObjectURL(image.previewUrl);
        });
        setSelectedImages([]);
        clearFileInput();
        setEmailError("");
        setStatus("sent");
        return;
      }

      const data = (await response.json().catch(() => null)) as {
        code?: string;
        error?: string;
      } | null;

      if (data?.code === "EMAIL_NOT_CONFIGURED") {
        setStatus("fallback");
        openMailFallback({ email, imageNames, message, subject });
        return;
      }

      setStatus("error");
      setErrorMessage(data?.error ?? "Message could not be sent.");
    } catch {
      setStatus("fallback");
      openMailFallback({ email, imageNames, message, subject });
    }
  }

  return (
    <>
      <button
        type="button"
        className="relative z-30 cursor-pointer touch-manipulation rounded-full border border-[#2d2d2d] px-5 py-2 text-sm font-medium transition hover:border-[#f2f2f2] hover:bg-[#f2f2f2] hover:text-[#0b0b0b]"
        onClick={() => {
          setIsOpen(true);
          setStatus("idle");
          setErrorMessage("");
          setEmailError("");
        }}
      >
        Email
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-4 backdrop-blur-sm sm:items-center sm:py-6">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-[520px] overflow-y-auto rounded-[24px] border border-[#2d2d2d]/0 bg-[#0f0f0f]/0 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.0)] sm:max-h-[calc(100dvh-3rem)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[1.35rem] font-semibold">Send a message</p>
                <p className="mt-1 text-sm text-[#9a9a9a]">
                  Include a subject, message, and optional image.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full px-3 py-1 cursor-pointer text-sm text-[#a3a3a3] transition hover:bg-white/10 hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                Close
              </button>
            </div>

            <form
              className="mt-5 flex flex-col gap-4"
              noValidate
              onSubmit={handleSubmit}
            >
              <label className="flex flex-col gap-2 text-sm font-medium">
                Your email
                <span className="relative">
                  <input
                    ref={emailInputRef}
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                    aria-invalid={emailError ? "true" : "false"}
                    aria-describedby={emailError ? "email-error-popup" : undefined}
                    placeholder="you@example.com"
                    className={`w-full rounded-[21px] border bg-[#151515]/50 px-4 py-3.5 text-sm font-medium outline-none transition placeholder:text-[#5f5f5f] focus:border-[#f2f2f2] ${
                      emailError ? "border-red-400" : "border-[#2d2d2d]"
                    }`}
                    onBlur={(event) => validateEmail(event.currentTarget.value.trim())}
                    onChange={(event) => {
                      const value = event.currentTarget.value.trim();

                      if (!value || emailPattern.test(value)) {
                        setEmailError("");
                      }
                    }}
                  />
                  {emailError ? (
                    <span
                      id="email-error-popup"
                      role="alert"
                      className="absolute left-4 top-[calc(100%+0.45rem)] z-10 rounded-[14px] border border-red-500/30 bg-[#220d0d] px-3 py-2 text-xs font-semibold text-red-100 shadow-[0_14px_36px_rgba(0,0,0,0.35)]"
                    >
                      {emailError}
                    </span>
                  ) : null}
                </span>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium">
                Subject
                <input
                  name="subject"
                  type="text"
                  required
                  placeholder="Project idea"
                  className="rounded-[21px] font-medium border border-[#2d2d2d] bg-[#151515]/50 px-4 py-3.5 text-sm outline-none transition placeholder:text-[#5f5f5f] focus:border-[#f2f2f2]"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium">
                Message
                <textarea
                  name="message"
                  required
                  rows={6}
                  placeholder="Tell me what you want to build."
                  className="resize-none font-medium rounded-[25px] border border-[#2d2d2d] bg-[#151515]/50 px-4 py-3 text-sm outline-none transition placeholder:text-[#5f5f5f] focus:border-[#f2f2f2]"
                />
              </label>

              <div className="flex flex-col gap-2 text-sm font-medium">
                <span>Image upload</span>
                <input
                  ref={fileInputRef}
                  name="image"
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={handleImageChange}
                />
                <div
                  role="button"
                  tabIndex={0}
                  className="flex h-[100px] cursor-pointer flex-col justify-center overflow-hidden rounded-[30px] border border-dashed border-[#3a3a3a] bg-[#151515]/50 px-3 py-3 text-center text-sm text-[#a3a3a3] outline-none transition hover:border-[#f2f2f2] hover:text-[#f2f2f2] focus:border-[#f2f2f2]"
                  onClick={openFilePicker}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openFilePicker();
                    }
                  }}
                >
                  {selectedImages.length ? (
                    <div className="grid h-full grid-cols-3 gap-3">
                      {selectedImages.map((image) => (
                        <div
                          key={image.id}
                          className="relative min-h-0 overflow-hidden rounded-[16px] border border-[#2d2d2d] bg-[#151515]/50"
                        >
                          <Image
                            src={image.previewUrl}
                            alt={image.file.name}
                            fill
                            unoptimized
                            sizes="150px"
                            className="object-cover"
                          />
                          <button
                            type="button"
                            aria-label={`Remove ${image.file.name}`}
                            className="absolute right-1.5 top-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/75 text-sm font-semibold leading-none text-white transition hover:bg-white hover:text-black"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              removeImage(image.id);
                            }}
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="flex flex-col items-center justify-center">
                      <span className="font-semibold text-[#f2f2f2]">
                        Tap to choose images
                      </span>
                      <span className="mt-1 text-xs text-[#7a7a7a]">
                        Up to {maxImageCount} images
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {status === "sent" ? (
                <p className="rounded-[14px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  Message sent.
                </p>
              ) : null}

              {status === "fallback" ? (
                <p className="rounded-[14px] border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
                  Email sending is not configured here, so your mail app was
                  opened instead.
                </p>
              ) : null}

              {status === "error" ? (
                <p className="rounded-[14px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={status === "sending"}
                className="rounded-full bg-[#f2f2f2] cursor-pointer px-5 py-3 text-sm font-semibold text-[#0b0b0b] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "sending" ? "Sending..." : "Send message"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
