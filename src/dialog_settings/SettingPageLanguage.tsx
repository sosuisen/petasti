/**
 * Petasti
 * © 2023 Hidekazu Kubota
 */
import * as React from 'react';
import './SettingPageLanguage.css';
import { useDispatch, useSelector } from 'react-redux';
import { MenuItemProps } from './MenuItem';
import { availableLanguages, MessageLabel } from '../modules_common/i18n';
import { SettingPageTemplate } from './SettingPageTemplate';
import { SelectableTag } from './SelectableTag';
import { selectorLanguage, selectorMessages } from './selector';
import { settingsLanguageUpdateCreator } from './action_creator';

export interface SettingPageLanguageProps {
  item: MenuItemProps;
  index: number;
}

export function SettingPageLanguage (props: SettingPageLanguageProps) {
  const dispatch = useDispatch();

  const messages = useSelector(selectorMessages);
  const language = useSelector(selectorLanguage);

  const handleClick = (value: string) => {
    dispatch(settingsLanguageUpdateCreator(value));
  };

  const languages = availableLanguages.map(lang => (
    <SelectableTag
      click={handleClick}
      label={messages[lang as MessageLabel]}
      value={lang}
      selected={language === lang}
    ></SelectableTag>
  ));

  return (
    <SettingPageTemplate item={props.item} index={props.index}>
      <p>{messages.languageDetailedText}</p>
      <p>
        <div styleName='currentLanguageLabel'>{messages.currentLanguage}:</div>
        <SelectableTag
          click={handleClick}
          label={messages[language as MessageLabel]}
          value={language}
          selected={true}
        ></SelectableTag>
      </p>
      <p style={{ clear: 'both' }}>{messages.selectableLanguages}:</p>
      <div>{languages}</div>
    </SettingPageTemplate>
  );
}
