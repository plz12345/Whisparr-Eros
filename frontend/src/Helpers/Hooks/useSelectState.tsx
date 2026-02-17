import { cloneDeep } from 'lodash';
import { useReducer } from 'react';
import ModelBase from 'App/ModelBase';
import areAllSelected from 'Utilities/Table/areAllSelected';
import selectAll from 'Utilities/Table/selectAll';
import toggleSelected from 'Utilities/Table/toggleSelected';

export type SelectedState = Record<number | string, boolean>;

export interface SelectState {
  selectedState: SelectedState;
  lastToggled: number | string | null;
  allSelected: boolean;
  allUnselected: boolean;
}

export type SelectAction =
  | { type: 'reset' }
  | { type: 'selectAll'; items: ModelBase[] }
  | { type: 'unselectAll'; items: ModelBase[] }
  | {
      type: 'toggleSelected';
      id: number | string;
      isSelected: boolean | null;
      shiftKey: boolean;
      items: ModelBase[];
    }
  | {
      type: 'removeItem';
      id: number | string;
    }
  | {
      type: 'updateItems';
      items: ModelBase[];
    }
  | {
      type: 'addItems';
      items: ModelBase[];
    };

export type Dispatch = (action: SelectAction) => void;

const initialState = {
  selectedState: {},
  lastToggled: null,
  allSelected: false,
  allUnselected: true,
  items: [],
};

// Only add new items to the selection state, do not reset selection to just current page
function addItemsToSelectedState(
  items: ModelBase[],
  existingState: SelectedState
) {
  const acc = { ...existingState };
  for (const item of items) {
    if (!(item.id in acc)) {
      acc[item.id] = false;
    }
  }
  return acc;
}

// Remove items from selection state that are not in the global movie list
function pruneSelectedState(
  validIds: (number | string)[],
  existingState: SelectedState
) {
  const acc: SelectedState = {};
  for (const id of validIds) {
    if (existingState[id]) {
      acc[id] = true;
    }
  }
  return acc;
}

// Restore getSelectedState for initial state usage
function getSelectedState(items: ModelBase[], existingState: SelectedState) {
  return items.reduce((acc: SelectedState, item) => {
    const id = item.id;
    acc[id] = existingState[id] ?? false;
    return acc;
  }, {});
}

function selectReducer(state: SelectState, action: SelectAction): SelectState {
  const { selectedState } = state;

  switch (action.type) {
    case 'reset': {
      return cloneDeep(initialState);
    }
    case 'selectAll': {
      return {
        ...selectAll(selectedState, true),
      };
    }
    case 'unselectAll': {
      return {
        ...selectAll(selectedState, false),
      };
    }
    case 'toggleSelected': {
      const result = {
        ...toggleSelected(
          state,
          action.items,
          action.id,
          action.isSelected,
          action.shiftKey
        ),
      };
      return result;
    }
    case 'addItems': {
      const nextSelectedState = addItemsToSelectedState(
        action.items,
        selectedState
      );
      return {
        ...state,
        ...areAllSelected(nextSelectedState),
        selectedState: nextSelectedState,
      };
    }
    case 'updateItems': {
      // Prune selection state to only valid IDs (e.g., after deletion)
      const validIds = action.items.map((i) => i.id);
      const nextSelectedState = pruneSelectedState(validIds, selectedState);
      return {
        ...state,
        ...areAllSelected(nextSelectedState),
        selectedState: nextSelectedState,
      };
    }
    default: {
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }
}

export default function useSelectState(): [SelectState, Dispatch] {
  const selectedState = getSelectedState([], {});

  const [state, dispatch] = useReducer(selectReducer, {
    selectedState,
    lastToggled: null,
    allSelected: false,
    allUnselected: true,
  });

  return [state, dispatch];
}
