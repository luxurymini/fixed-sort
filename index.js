/*
	version 1.0
	Update : 2017-11-09
	아이템을 지정자리에 고정시킵니다.
	
	TODO: 고정되지 않은거 차례대로 정렬하는것도 추가해야함.
*/
const path = require('path');
const fs = require('fs');

module.exports = function fixed(dispatch) {
	let enabled = true;
	let isSort = false;
	let iterator;

	let fixedItemList;
	// [{ id: int32, col: (0~7), row: (0 ~ ) }]
	let itemList = [];
	let invenSize = 0;
	let invenId;
	try {
		fixedItemList = require('./item.json');
	} catch (e) {
		fixedItemList = [];
	}
	fixedItemList = fixedItemList.sort(
		(a, b) => a.row - b.row || b.col - a.col
	);

	/*******************************************************
	 * 캐릭정보
	 *******************************************************/

	dispatch.hook('S_LOGIN', 2, event => {
		itemList = [];
	});

	/*******************************************************
	 * 인벤토리
	 *******************************************************/

	dispatch.hook('S_INVEN', '*', event => {
		invenSize = event.size;
		invenId = event.id;
		if (event.more) {
			itemList = event.items.filter(x => x.slot >= 40);
		} else {
			itemList = itemList.concat(event.items.filter(x => x.slot >= 40));
			itemList = itemList.sort((a, b) => a.slot - b.slot);

			if (isSort) {
				let i = iterator.next();
				if (i.done) isSort = false;
			}
		}
	});

	dispatch.hook('C_INVENTORY_AUTO_SORT', '*', event => {
		if (!enabled) return;
		if (event.invType === 0) {
			iterator = fixedSort();
			iterator.next();
			isSort = true;
		}
		// 자동정렬 버튼 누르면 동작
		return false;
	});

	/*******************************************************
	 * 정리함수
	 *******************************************************/
	function* fixedSort() {
		const maxRows = invenSize / 8;
		for (const fixedItem of fixedItemList) {
			let isSend = false;
			for (const id of fixedItem.id) {
				const toSlot =
					(maxRows - fixedItem.row - 1) * 8 + fixedItem.col + 40;

				const list = itemList
					.filter(x => x.dbid === id && x.slot < toSlot)
					.sort((a, b) => b.amount - a.amount);

				// 해당 물건이 없으면
				if (list.length === 0) continue;

				// 현재 위치 아이템이랑 동일 아이템일경우 스텍이 많은것으로함
				// 현재 것이 더 많거나 같으면 break;
				// TODO: NEDD TEST
				const currnt = itemList.find(x => x.slot === toSlot);
				if (find && currnt.amount >= list[0].amount) break;

				isSend = true;
				dispatch.toServer('C_MOVE_INVEN_POS', '*', {
					source: invenId,
					from: list[0].slot,
					to: toSlot,
				});
			}
			if (isSend) yield;
		}
	}
};
