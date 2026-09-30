import { saveGuidePrice } from '@/app/equipment-guide/actions';

type Props = {
  guideKind: 'rubber' | 'blade';
  itemKey: string;
  label: string;
  minPrice: number;
  maxPrice: number;
  returnTo: '/rubber-guide' | '/blade-guide';
  canEdit: boolean;
  note?: string;
  customized?: boolean;
};

const money = (value:number) => `$${Math.round(value).toLocaleString('zh-TW')}`;

export default function GuidePriceEditor({ guideKind, itemKey, label, minPrice, maxPrice, returnTo, canEdit, note, customized }: Props) {
  return <div className="guidePriceRow">
    <div className="guidePriceInfo"><b>{label}</b><strong>{money(minPrice)}～{money(maxPrice)}</strong>{note ? <small>{note}</small> : null}<em>{customized ? '球隊自訂價格' : '系統參考價格'}</em></div>
    {canEdit ? <form action={saveGuidePrice} className="guidePriceForm">
      <input type="hidden" name="guide_kind" value={guideKind}/><input type="hidden" name="item_key" value={itemKey}/><input type="hidden" name="return_to" value={returnTo}/>
      <label>最低<input type="number" name="min_price" min="0" step="50" defaultValue={minPrice}/></label>
      <label>最高<input type="number" name="max_price" min="0" step="50" defaultValue={maxPrice}/></label>
      <button className="secondaryButton">更新</button>
    </form> : null}
  </div>;
}
