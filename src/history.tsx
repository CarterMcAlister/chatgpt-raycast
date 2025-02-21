import { ActionPanel, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { DestructiveAction, TextToSpeechAction } from "./actions";
import { CopyActionSection } from "./actions/copy";
import { PreferencesActionSection } from "./actions/preferences";
import { SaveActionSection } from "./actions/save";
import { Chat, SavedChat } from "./type";
import { AnswerDetailView } from "./views/answer-detail";

export default function History() {
  const [history, setHistory] = useState<Chat[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const storedHistory = await LocalStorage.getItem<string>("history");

      if (!storedHistory) {
        setHistory([]);
      } else {
        setHistory((previous) => [...previous, ...JSON.parse(storedHistory)]);
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const storedSavedAnswers = await LocalStorage.getItem<string>("savedChats");

      if (!storedSavedAnswers) {
        setSavedChats([]);
      } else {
        setSavedChats((previous) => [...previous, ...JSON.parse(storedSavedAnswers)]);
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    LocalStorage.setItem("savedChats", JSON.stringify(savedChats));
  }, [savedChats]);

  const handleRemoveChat = useCallback(
    async (answer: Chat) => {
      const toast = await showToast({
        title: "Removing answer...",
        style: Toast.Style.Animated,
      });
      const newHistory = history.filter((item) => item.id !== answer.id);
      setHistory(newHistory);
      toast.title = "Answer removed!";
      toast.style = Toast.Style.Success;
    },
    [setHistory, history]
  );

  const handleClearHistory = useCallback(async () => {
    const toast = await showToast({
      title: "Clearing history...",
      style: Toast.Style.Animated,
    });
    setHistory([]);
    toast.title = "History cleared!";
    toast.style = Toast.Style.Success;
  }, [setHistory]);

  const handleSaveChat = useCallback(
    async (chat: Chat) => {
      const toast = await showToast({
        title: "Saving your answer...",
        style: Toast.Style.Animated,
      });
      const newSavedChat: SavedChat = { ...chat, saved_at: new Date().toISOString() };
      setSavedChats([...savedChats, newSavedChat]);
      toast.title = "Answer saved!";
      toast.style = Toast.Style.Success;
    },
    [setSavedChats, savedChats]
  );

  const getActionPanel = (chat: Chat) => (
    <ActionPanel>
      <CopyActionSection answer={chat.answer} question={chat.question} />
      <SaveActionSection
        onSaveAnswerAction={() => handleSaveChat(chat)}
        snippet={{ text: chat.answer, name: chat.question }}
      />
      <ActionPanel.Section title="Output">
        <TextToSpeechAction content={chat.answer} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Delete">
        <DestructiveAction
          title="Remove Answer"
          dialog={{
            title: "Are you sure you want to remove this answer from your history?",
          }}
          onAction={() => handleRemoveChat(chat)}
        />
        <DestructiveAction
          title="Clear History"
          dialog={{
            title: "Are you sure you want to clear your history?",
          }}
          onAction={() => handleClearHistory()}
          shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
        />
      </ActionPanel.Section>
      <PreferencesActionSection />
    </ActionPanel>
  );

  const sortedHistory = history.sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  );

  const filteredHistory = sortedHistory.filter((answer) => {
    if (searchText === "") {
      return true;
    }
    return (
      answer.question.toLowerCase().includes(searchText.toLowerCase()) ||
      answer.answer.toLowerCase().includes(searchText.toLowerCase())
    );
  });

  return (
    <List
      isShowingDetail={filteredHistory.length === 0 ? false : true}
      isLoading={isLoading}
      filtering={false}
      throttle={false}
      navigationTitle={"Saved Answers"}
      selectedItemId={selectedAnswerId || undefined}
      onSelectionChange={(id) => {
        if (id !== selectedAnswerId) {
          setSelectedAnswerId(id);
        }
      }}
      searchBarPlaceholder="Search history..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {history.length === 0 ? (
        <List.EmptyView
          title="No history"
          description="Your recent questions will be showed up here"
          icon={Icon.Stars}
        />
      ) : (
        <List.Section title="Recent" subtitle={filteredHistory.length.toLocaleString()}>
          {filteredHistory.map((answer) => (
            <List.Item
              id={answer.id}
              key={answer.id}
              title={answer.question}
              accessories={[{ text: new Date(answer.created_at ?? 0).toLocaleDateString() }]}
              detail={<AnswerDetailView chat={answer} />}
              actions={answer && selectedAnswerId === answer.id ? getActionPanel(answer) : undefined}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
