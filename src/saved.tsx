import { ActionPanel, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { DestructiveAction, SaveAsSnippetAction, TextToSpeechAction } from "./actions";
import { CopyActionSection } from "./actions/copy";
import { PreferencesActionSection } from "./actions/preferences";
import { Chat, SavedChat } from "./type";
import { AnswerDetailView } from "./views/answer-detail";

export default function SavedAnswer() {
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [isLoading, setLoading] = useState<boolean>(true);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const storedSavedAnswers = await LocalStorage.getItem<string>("savedChats");

      if (!storedSavedAnswers) {
        setSavedChats([]);
      } else {
        setSavedChats((previous) => [...previous, ...JSON.parse(storedSavedAnswers)]);
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("savedChats", JSON.stringify(savedChats));
  }, [savedChats]);

  const handleUnsaveChat = useCallback(
    async (chat: Chat) => {
      const toast = await showToast({
        title: "Unsaving your answer...",
        style: Toast.Style.Animated,
      });
      const newSavedChats = savedChats.filter((savedAnswer) => savedAnswer.id !== chat.id);
      setSavedChats(newSavedChats);
      toast.title = "Answer unsaved!";
      toast.style = Toast.Style.Success;
    },
    [setSavedChats, savedChats]
  );

  const getActionPanel = (chat: Chat) => (
    <ActionPanel>
      <CopyActionSection answer={chat.answer} question={chat.question} />
      <SaveAsSnippetAction text={chat.answer} name={chat.question} />
      <ActionPanel.Section title="Output">
        <TextToSpeechAction content={chat.answer} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Delete">
        <DestructiveAction
          title="Remove Answer"
          dialog={{
            title: "Are you sure you want to remove this answer from your collection?",
          }}
          onAction={() => handleUnsaveChat(chat)}
        />
        <DestructiveAction
          title="Remove All Answer"
          dialog={{
            title: "Are you sure you want to remove all your saved answer from your collection?",
            primaryButton: "Remove All",
          }}
          onAction={() => setSavedChats([])}
          shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
        />
      </ActionPanel.Section>
      <PreferencesActionSection />
    </ActionPanel>
  );

  const sortedAnswers = savedChats.sort(
    (a, b) => new Date(b.saved_at ?? 0).getTime() - new Date(a.saved_at ?? 0).getTime()
  );

  const filteredAnswers = sortedAnswers
    .filter((value, index, self) => index === self.findIndex((answer) => answer.id === value.id))
    .filter((answer) => {
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
      isShowingDetail={filteredAnswers.length === 0 ? false : true}
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
      searchBarPlaceholder="Search saved answers/questions..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {savedChats.length === 0 ? (
        <List.EmptyView
          title="No saved answers"
          description="Save generated question with ⌘ + S shortcut"
          icon={Icon.Stars}
        />
      ) : (
        <List.Section title="Saved" subtitle={filteredAnswers.length.toLocaleString()}>
          {filteredAnswers.map((answer) => (
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
