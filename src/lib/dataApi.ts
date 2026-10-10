// Firestoreへの書き込み処理をまとめたデータAPI層
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  writeBatch,
  type Transaction as FirestoreTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  feeItemsPath,
  groupFeeItemsPath,
  occupancyPath,
  productsPath,
  registerSessionsPath,
  staffPath,
  ticketsPath,
  transactionsPath,
  yearPath,
  yearsPath,
} from "@/lib/paths";
import {
  defaultFeeItems,
  defaultGroupFeeItems,
  defaultProducts,
  defaultYearSettings,
} from "@/utils/defaults";
import { dateStringFromMs } from "@/utils/format";
import type {
  CashBreakdown,
  EnvName,
  FeeItem,
  GroupFeeItem,
  Product,
  RegisterSessionType,
  StaffMember,
  Ticket,
  TicketPendingData,
  Transaction,
  YearDoc,
  YearSettings,
} from "@/types";

/** 新規年度を作成し、初期の入場料項目・商品を併せて登録する */
export async function createYear(
  env: EnvName,
  name: string,
  startDate: string,
  endDate: string,
) {
  const batch = writeBatch(db);
  const yearRef = doc(collection(db, yearsPath(env)));
  batch.set(yearRef, {
    name,
    startDate,
    endDate,
    settings: defaultYearSettings,
    createdAt: Date.now(),
  });
  defaultFeeItems.forEach((item) => {
    batch.set(doc(collection(db, feeItemsPath(env, yearRef.id))), item);
  });
  defaultGroupFeeItems.forEach((item) => {
    batch.set(doc(collection(db, groupFeeItemsPath(env, yearRef.id))), item);
  });
  defaultProducts.forEach((product) => {
    batch.set(doc(collection(db, productsPath(env, yearRef.id))), product);
  });
  await batch.commit();
  return yearRef.id;
}

/**
 * 年度データの全削除。Firestoreはサブコレクションをカスケード削除しないため、
 * 各サブコレクションを全件取得し、writeBatchの上限（500件）を下回るチャンクに分けて順次削除する。
 * 書き込み過多を避けるため並列化はせず、チャンク単位で順番にコミットする
 */
export async function deleteYear(env: EnvName, yearId: string): Promise<void> {
  const BATCH_LIMIT = 450;
  const subcollectionPaths = [
    feeItemsPath(env, yearId),
    groupFeeItemsPath(env, yearId),
    productsPath(env, yearId),
    staffPath(env, yearId),
    transactionsPath(env, yearId),
    ticketsPath(env, yearId),
    occupancyPath(env, yearId),
    registerSessionsPath(env, yearId),
  ];

  for (const path of subcollectionPaths) {
    const snapshot = await getDocs(collection(db, path));
    for (let i = 0; i < snapshot.docs.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      snapshot.docs
        .slice(i, i + BATCH_LIMIT)
        .forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  await deleteDoc(doc(db, yearPath(env, yearId)));
}

export async function updateYearSettings(
  env: EnvName,
  yearId: string,
  patch: Partial<{ settings: YearSettings }>,
) {
  await updateDoc(doc(db, yearsPath(env), yearId), patch);
}

/** 年度のタイトル・開始日・終了日を更新する */
export async function updateYearInfo(
  env: EnvName,
  yearId: string,
  patch: Partial<Pick<YearDoc, "name" | "startDate" | "endDate">>,
) {
  await updateDoc(doc(db, yearsPath(env), yearId), patch);
}

// ---- 入場料項目 ----
export async function addFeeItem(
  env: EnvName,
  yearId: string,
  item: Omit<FeeItem, "id">,
) {
  await addDoc(collection(db, feeItemsPath(env, yearId)), item);
}
export async function updateFeeItem(
  env: EnvName,
  yearId: string,
  id: string,
  patch: Partial<FeeItem>,
) {
  await updateDoc(doc(db, feeItemsPath(env, yearId), id), patch);
}
export async function deleteFeeItem(env: EnvName, yearId: string, id: string) {
  await deleteDoc(doc(db, feeItemsPath(env, yearId), id));
}

// ---- グループ料金項目 ----
export async function addGroupFeeItem(
  env: EnvName,
  yearId: string,
  item: Omit<GroupFeeItem, "id">,
) {
  await addDoc(collection(db, groupFeeItemsPath(env, yearId)), item);
}
export async function updateGroupFeeItem(
  env: EnvName,
  yearId: string,
  id: string,
  patch: Partial<GroupFeeItem>,
) {
  await updateDoc(doc(db, groupFeeItemsPath(env, yearId), id), patch);
}
export async function deleteGroupFeeItem(
  env: EnvName,
  yearId: string,
  id: string,
) {
  await deleteDoc(doc(db, groupFeeItemsPath(env, yearId), id));
}

// ---- 商品 ----
export async function addProduct(
  env: EnvName,
  yearId: string,
  product: Omit<Product, "id">,
) {
  await addDoc(collection(db, productsPath(env, yearId)), product);
}
export async function updateProduct(
  env: EnvName,
  yearId: string,
  id: string,
  patch: Partial<Product>,
) {
  await updateDoc(doc(db, productsPath(env, yearId), id), patch);
}
export async function deleteProduct(env: EnvName, yearId: string, id: string) {
  await deleteDoc(doc(db, productsPath(env, yearId), id));
}

// ---- スタッフ ----
export async function addStaff(env: EnvName, yearId: string, name: string) {
  const list = collection(db, staffPath(env, yearId));
  await addDoc(list, { name, active: true, order: Date.now() } satisfies Omit<
    StaffMember,
    "id"
  >);
}
export async function updateStaff(
  env: EnvName,
  yearId: string,
  id: string,
  patch: Partial<StaffMember>,
) {
  await updateDoc(doc(db, staffPath(env, yearId), id), patch);
}
export async function deleteStaff(env: EnvName, yearId: string, id: string) {
  await deleteDoc(doc(db, staffPath(env, yearId), id));
}

async function readActiveStaff(
  transaction: FirestoreTransaction,
  env: EnvName,
  yearId: string,
  staffId: string,
) {
  const snapshot = await transaction.get(
    doc(db, staffPath(env, yearId), staffId),
  );
  if (!snapshot.exists() || snapshot.get("active") !== true) {
    throw new Error(
      "担当者が無効になりました。稼働中の担当者を選び直してください",
    );
  }
  return { id: snapshot.id, name: snapshot.get("name") as string };
}

// ---- 取引（確定） ----
export interface ConfirmTransactionInput extends Omit<
  Transaction,
  "id" | "date" | "createdAt" | "updatedAt"
> {}

/** レジ確定。取引の保存と同時に、混雑マップ用の入場記録も1件登録する */
export async function confirmTransaction(
  env: EnvName,
  yearId: string,
  input: ConfirmTransactionInput,
) {
  const txRef = doc(collection(db, transactionsPath(env, yearId)));
  const now = Date.now();
  const date = dateStringFromMs(now);
  const occupancyRef =
    input.entryCount > 0
      ? doc(collection(db, occupancyPath(env, yearId)))
      : null;
  const ticketRef = input.ticketId
    ? doc(db, ticketsPath(env, yearId), input.ticketId)
    : null;

  await runTransaction(db, async (transaction) => {
    const currentStaff = await readActiveStaff(
      transaction,
      env,
      yearId,
      input.staffId,
    );
    if (ticketRef) {
      const ticketSnapshot = await transaction.get(ticketRef);
      if (
        !ticketSnapshot.exists() ||
        ticketSnapshot.get("status") !== "pending"
      ) {
        throw new Error("この整理券はすでに精算済みか、利用できません");
      }
    }

    transaction.set(txRef, {
      ...input,
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      date,
      createdAt: now,
      updatedAt: now,
    });

    if (occupancyRef) {
      transaction.set(occupancyRef, {
        date,
        entryTime: now,
        partySize: input.entryCount,
        transactionId: txRef.id,
        viaTicket: Boolean(input.ticketId),
      });
    }

    if (ticketRef) {
      transaction.update(ticketRef, {
        status: "settled",
        settledAt: now,
        settledTransactionId: txRef.id,
      });
    }
  });
  return txRef.id;
}

export async function updateTransaction(
  env: EnvName,
  yearId: string,
  id: string,
  staffId: string,
  patch: Partial<Transaction>,
) {
  const transactionRef = doc(db, transactionsPath(env, yearId), id);
  const updatedAt = Date.now();
  await runTransaction(db, async (transaction) => {
    await readActiveStaff(transaction, env, yearId, staffId);
    transaction.update(transactionRef, { ...patch, updatedAt });
  });
}
export async function deleteTransaction(
  env: EnvName,
  yearId: string,
  id: string,
) {
  await deleteDoc(doc(db, transactionsPath(env, yearId), id));
}

/** 年度単位CSV出力用。常時購読はせず、出力操作時にのみ一括取得する */
export async function fetchAllTransactions(
  env: EnvName,
  yearId: string,
): Promise<Transaction[]> {
  const snapshot = await getDocs(
    query(
      collection(db, transactionsPath(env, yearId)),
      orderBy("createdAt", "asc"),
    ),
  );
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Transaction, "id">),
  }));
}

// ---- 整理券 ----
export async function issueTicket(
  env: EnvName,
  yearId: string,
  serial: string,
  arrivalTime: string,
  pendingData: TicketPendingData,
) {
  const now = Date.now();
  await addDoc(collection(db, ticketsPath(env, yearId)), {
    date: dateStringFromMs(now),
    serial,
    arrivalTime,
    status: "pending",
    pendingData,
    createdAt: now,
    settledAt: null,
    settledTransactionId: null,
  } satisfies Omit<Ticket, "id">);
}
export async function deleteTicket(env: EnvName, yearId: string, id: string) {
  await updateDoc(doc(db, ticketsPath(env, yearId), id), { status: "deleted" });
}

// ---- レジ開け・締め ----
export async function recordRegisterSession(
  env: EnvName,
  yearId: string,
  input: {
    date: string;
    type: RegisterSessionType;
    staffId: string;
    staffName: string;
    cashBreakdown: CashBreakdown;
    totalAmount: number;
    expectedAmount: number | null;
    diffFromOpen: number | null;
    diffFromSales: number | null;
  },
) {
  const sessionRef = doc(collection(db, registerSessionsPath(env, yearId)));
  const createdAt = Date.now();
  await runTransaction(db, async (transaction) => {
    const currentStaff = await readActiveStaff(
      transaction,
      env,
      yearId,
      input.staffId,
    );
    transaction.set(sessionRef, {
      ...input,
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      createdAt,
    });
  });
}
