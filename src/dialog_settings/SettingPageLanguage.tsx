/**
 * TreeStickies
 * © 2021 Hidekazu Kubota
 */
import * as React from 'react';
import { GlobalContext, GlobalProvider } from './StoreProvider';
import './SettingPageLanguage.css';
import { MenuItemProps } from './MenuItem';
import { availableLanguages, MessageLabel } from '../modules_common/i18n';
import { SettingPageTemplate } from './SettingPageTemplate';
import { SelectableTag } from './SelectableTag';

export interface SettingPageLanguageProps {
  item: MenuItemProps;
  index: number;
}

export const SettingPageLanguage = (props: SettingPageLanguageProps) => {
  const [globalState, globalDispatch] = React.useContext(GlobalContext) as GlobalProvider;
  const MESSAGE = (label: MessageLabel) => {
    return globalState.temporal.messages[label];
  };

  const handleClick = (value: string) => {
    globalDispatch({ type: 'language-put', payload: value });
  };

  const languages = availableLanguages.map(lang => (
    <SelectableTag
      click={handleClick}
      label={MESSAGE(lang as MessageLabel)}
      value={lang}
      selected={globalState.persistent.language === lang}
    ></SelectableTag>
  ));

  return (
    <SettingPageTemplate item={props.item} index={props.index}>
      <p>{MESSAGE('languageDetailedText')}</p>
      <p>
        <div styleName='currentLanguageLabel'>{MESSAGE('currentLanguage')}:</div>
        <SelectableTag
          click={handleClick}
          label={MESSAGE(globalState.persistent.language as MessageLabel)}
          value={globalState.persistent.language}
          selected={true}
        ></SelectableTag>
      </p>
      <p style={{ clear: 'both' }}>{MESSAGE('selectableLanguages')}:</p>
      <div>{languages}</div>
    </SettingPageTemplate>
  );
};
