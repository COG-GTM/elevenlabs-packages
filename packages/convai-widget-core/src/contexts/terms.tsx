import {
  computed,
  ReadonlySignal,
  useComputed,
  useSignal,
  useSignalEffect,
} from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext, useMemo } from "preact/compat";

import { useContextSafely } from "../utils/useContextSafely";
import {
  readTermsAccepted,
  resolveAgentId,
  storeTermsAccepted,
  termsStorageKey,
} from "../utils/termsStorage";
import { useAttribute } from "./attributes";
import { useLocalizedTerms } from "./widget-config";

const TermsContext = createContext<{
  termsAccepted: ReadonlySignal<boolean>;
  termsShown: ReadonlySignal<boolean>;
  requestTerms: () => Promise<void>;
  dismissTerms: () => void;
  acceptTerms: () => void;
} | null>(null);

interface TermsProviderProps {
  children: ComponentChildren;
}

interface StoredPromise {
  resolve: () => void;
  reject: () => void;
}

export function TermsProvider({ children }: TermsProviderProps) {
  const localizedTerms = useLocalizedTerms();
  const agentId = useAttribute("agent-id");
  const signedUrl = useAttribute("signed-url");
  const storageKey = useComputed(() =>
    termsStorageKey(
      resolveAgentId(agentId.value, signedUrl.value),
      localizedTerms.value.terms_key
    )
  );

  const termsShown = useSignal(false);
  const termsAcceptedState = useSignal(false);

  const value = useMemo(() => {
    const termsAccepted = computed(
      () => !localizedTerms.value.terms_html || termsAcceptedState.value
    );
    let termsPromises: StoredPromise[] = [];

    return {
      termsShown,
      termsAccepted,
      dismissTerms: () => {
        termsShown.value = false;
        termsPromises.forEach(value => value.reject());
        termsPromises = [];
      },
      acceptTerms: () => {
        termsAcceptedState.value = true;
        termsShown.value = false;
        storeTermsAccepted(storageKey.peek());

        termsPromises.forEach(value => value.resolve());
        termsPromises = [];
      },
      requestTerms: async () => {
        if (!termsAccepted.peek()) {
          termsShown.value = true;
          await new Promise<void>((resolve, reject) => {
            termsPromises.push({ resolve, reject });
          });
        }
      },
    };
  }, [termsShown, termsAcceptedState, localizedTerms, storageKey]);

  useSignalEffect(() => {
    termsAcceptedState.value = readTermsAccepted(storageKey.value);
  });

  return (
    <TermsContext.Provider value={value}>{children}</TermsContext.Provider>
  );
}

export function useTerms() {
  return useContextSafely(TermsContext);
}
